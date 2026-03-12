import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { randomBytes } from "crypto";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  authenticate,
  type AuthenticatedRequest,
  hashPassword,
  verifyPassword,
  hasPermission,
  canInviteMembers,
  canEditList,
  canEditItems,
} from "./auth";
import { toApiResponse, toApiListResponse, toApiItemProgressResponse, toApiItemResponse, toApiInviteResponse, toApiInviteListResponse, toApiMemberResponse } from "./utils";
import { PermissionLevel, items, lists } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const emailSchema = z.string().email();
      const passwordSchema = z.string().min(6);
      const nameSchema = z.string().min(1);
      
      const email = emailSchema.parse(req.body.email);
      const password = passwordSchema.parse(req.body.password);
      const name = nameSchema.parse(req.body.name);
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
      
      const user = await storage.createUser(email, password, name);
      
      const accessToken = generateAccessToken({ userExternalId: user.externalId, email: user.email });
      const refreshToken = generateRefreshToken({ userExternalId: user.externalId, email: user.email });
      
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await storage.createRefreshToken(user.id, refreshToken, expiresAt);
      
      setAuthCookies(res, accessToken, refreshToken);
      
      // Seed lists for first-time user
      const userLists = await storage.getLists(user.id);
      if (userLists.length === 0) {
        const moviesList = await storage.createList({ userId: user.id, name: "Movies to Watch", description: "A list of movies I want to see" });
        await storage.createItem({ listExternalId: moviesList.externalId, name: "Inception" }, user.id);
        await storage.createItem({ listExternalId: moviesList.externalId, name: "Interstellar" }, user.id);
        await storage.createItem({ listExternalId: moviesList.externalId, name: "The Matrix" }, user.id);
        
        const booksList = await storage.createList({ userId: user.id, name: "Books to Read", description: "My reading backlog" });
        await storage.createItem({ listExternalId: booksList.externalId, name: "1984" }, user.id);
        await storage.createItem({ listExternalId: booksList.externalId, name: "Brave New World" }, user.id);
      }
      
      res.status(201).json({ externalId: user.externalId, email: user.email, name: user.name });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Register error:", err);
      throw err;
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const emailSchema = z.string().email();
      const passwordSchema = z.string().min(1);
      
      const email = emailSchema.parse(req.body.email);
      const password = passwordSchema.parse(req.body.password);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const accessToken = generateAccessToken({ userExternalId: user.externalId, email: user.email });
      const refreshToken = generateRefreshToken({ userExternalId: user.externalId, email: user.email });
      
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await storage.createRefreshToken(user.id, refreshToken, expiresAt);
      
      setAuthCookies(res, accessToken, refreshToken);
      
      res.json({ externalId: user.externalId, email: user.email, name: user.name });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Login error:", err);
      throw err;
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await storage.deleteRefreshToken(refreshToken);
    }
    clearAuthCookies(res);
    res.status(204).send();
  });

  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const token = req.cookies?.refreshToken;
      if (!token) {
        return res.status(401).json({ message: "No refresh token" });
      }
      
      const storedToken = await storage.getRefreshToken(token);
      if (!storedToken || storedToken.expiresAt < new Date()) {
        if (storedToken) {
          await storage.deleteRefreshToken(token);
        }
        return res.status(401).json({ message: "Invalid or expired refresh token" });
      }
      
      const payload = verifyRefreshToken(token);
      
      await storage.deleteRefreshToken(token);
      
      const user = await storage.getUserByExternalId(payload.userExternalId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const newAccessToken = generateAccessToken({ userExternalId: user.externalId, email: user.email });
      const newRefreshToken = generateRefreshToken({ userExternalId: user.externalId, email: user.email });
      
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await storage.createRefreshToken(user.id, newRefreshToken, expiresAt);
      
      setAuthCookies(res, newAccessToken, newRefreshToken);
      
      res.json({ externalId: user.externalId, email: user.email, name: user.name });
    } catch (err) {
      console.error("Refresh error:", err);
      return res.status(401).json({ message: "Invalid refresh token" });
    }
  });

  app.get("/api/auth/me", authenticate, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const user = await storage.getUserByExternalId(authReq.user!.userExternalId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    res.json({ id: user.id, externalId: user.externalId, email: user.email, name: user.name });
  });

  // Lists - Protected
  app.get(api.lists.list.path, authenticate, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const user = await storage.getUserByExternalId(authReq.user!.userExternalId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    const lists = await storage.getLists(user.id);
    const response = lists.map((list) => ({
      ...toApiResponse(list),
      items: list.items.map(item => ({
        ...toApiItemResponse(item),
        progress: item.progress ? toApiItemProgressResponse(item.progress) : undefined
      })),
      userPermission: list.userPermission
    }));
    res.json(response);
  });

  app.get(api.lists.get.path, authenticate, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const externalId = req.params.id as string;
    const user = await storage.getUserByExternalId(authReq.user!.userExternalId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    
    const list = await storage.getListByExternalId(externalId, user.id);
    if (!list) {
      return res.status(404).json({ message: 'List not found' });
    }
    
    res.json({
      ...toApiResponse(list),
      items: list.items.map(item => ({
        ...toApiItemResponse(item),
        progress: item.progress ? toApiItemProgressResponse(item.progress) : undefined,
        participantsProgress: item.participantsProgress
      })),
      userPermission: list.userPermission
    });
  });

  app.post(api.lists.create.path, authenticate, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = await storage.getUserByExternalId(authReq.user!.userExternalId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const input = api.lists.create.input.parse(req.body);
      const list = await storage.createList({ name: input.name, description: input.description, userId: user.id });
      res.status(201).json(toApiResponse(list));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.lists.get.path, authenticate, async (req, res) => {
    try {
      const externalId = req.params.id as string;
      const authReq = req as AuthenticatedRequest;
      const user = await storage.getUserByExternalId(authReq.user!.userExternalId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const input = api.lists.update.input.parse(req.body);
      const list = await storage.updateList(externalId, user.id, input);
      if (!list) {
        return res.status(404).json({ message: "List not found" });
      }
      res.json(toApiResponse(list));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.lists.delete.path, authenticate, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const externalId = req.params.id as string;
    const user = await storage.getUserByExternalId(authReq.user!.userExternalId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    await storage.deleteList(externalId, user.id);
    res.status(204).send();
  });

  // Items - Protected
  app.post(api.items.create.path, authenticate, async (req, res) => {
    try {
      const input = api.items.create.input.parse(req.body);
      const authReq = req as AuthenticatedRequest;
      const user = await storage.getUserByExternalId(authReq.user!.userExternalId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Verificar permissão
      const permInfo = await storage.getUserPermissionOnList(user.id, input.listExternalId);
      if (!permInfo) {
        return res.status(404).json({ message: "List not found" });
      }
      if (!canEditItems(permInfo.permission)) {
        return res.status(403).json({ message: "You don't have permission to add items" });
      }

      const item = await storage.createItem(input, user.id);
      res.status(201).json(toApiResponse(item));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.items.update.path, authenticate, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const externalId = req.params.id as string;
      const user = await storage.getUserByExternalId(authReq.user!.userExternalId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Buscar item para obter listId
      const [item] = await db.select().from(items).where(eq(items.externalId, externalId));
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      // Buscar lista externa
      const [list] = await db.select().from(lists).where(eq(lists.id, item.listId));
      if (!list) {
        return res.status(404).json({ message: "List not found" });
      }

      // Verificar permissão na lista
      const permInfo = await storage.getUserPermissionOnList(user.id, list.externalId);
      if (!permInfo) {
        return res.status(404).json({ message: "List not found" });
      }

      // Se está atualizando rating/review, pode ser qualquer membro
      // Se está atualizando nome do item, precisa de permissão EDITOR_ITEMS
      const input = api.items.update.input.parse(req.body);
      if (input.name !== undefined && !canEditItems(permInfo.permission)) {
        return res.status(403).json({ message: "You don't have permission to edit items" });
      }

      const result = await storage.updateItem(externalId, user.id, input);
      res.json({
        item: toApiResponse(result.item),
        progress: result.progress ? toApiItemProgressResponse(result.progress) : null
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      if (err instanceof Error && err.message === "Item not found") {
        return res.status(404).json({ message: "Item not found" });
      }
      throw err;
    }
  });

  app.delete(api.items.delete.path, authenticate, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const externalId = req.params.id as string;
    const user = await storage.getUserByExternalId(authReq.user!.userExternalId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Buscar item e lista
    const [item] = await db.select().from(items).where(eq(items.externalId, externalId));
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    const [list] = await db.select().from(lists).where(eq(lists.id, item.listId));
    if (!list) {
      return res.status(404).json({ message: "List not found" });
    }

    // Verificar permissão
    const permInfo = await storage.getUserPermissionOnList(user.id, list.externalId);
    if (!permInfo) {
      return res.status(404).json({ message: "List not found" });
    }
    if (!canEditItems(permInfo.permission)) {
      return res.status(403).json({ message: "You don't have permission to delete items" });
    }

    await storage.deleteItem(externalId, user.id);
    res.status(204).send();
  });

  // Invite Routes
  app.post(api.invites.create.path, authenticate, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const listExternalId = req.params.listId as string;
      const user = await storage.getUserByExternalId(authReq.user!.userExternalId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const permissionInfo = await storage.getUserPermissionOnList(user.id, listExternalId);
      if (!permissionInfo || !canInviteMembers(permissionInfo.permission)) {
        return res.status(403).json({ message: "You don't have permission to invite members" });
      }

      const input = api.invites.create.input.parse(req.body);
      const listId = await storage.getListInternalIdByExternalId(listExternalId);
      if (!listId) {
        return res.status(404).json({ message: "List not found" });
      }

      const token = randomBytes(32).toString("hex");
      const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

      const invite = await storage.createInvite({
        token,
        listId,
        permission: input.permission,
        message: input.message || null,
        maxMembers: input.maxMembers || null,
        expiresAt,
        createdBy: user.id,
      });

      const inviteUrl = `/invite/${token}`;
      res.status(201).json({
        inviteId: invite.externalId,
        token: invite.token,
        url: inviteUrl,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Create invite error:", err);
      throw err;
    }
  });

  app.get(api.invites.list.path, authenticate, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const listExternalId = req.params.listId as string;
      const user = await storage.getUserByExternalId(authReq.user!.userExternalId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const permissionInfo = await storage.getUserPermissionOnList(user.id, listExternalId);
      if (!permissionInfo || !permissionInfo.isOwner) {
        return res.status(403).json({ message: "Only the owner can list invites" });
      }

      const listId = await storage.getListInternalIdByExternalId(listExternalId);
      if (!listId) {
        return res.status(404).json({ message: "List not found" });
      }

      const invites = await storage.getInvitesByListId(listId);
      res.json(toApiInviteListResponse(invites));
    } catch (err) {
      console.error("List invites error:", err);
      throw err;
    }
  });

  app.patch(api.invites.update.path, authenticate, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const listExternalId = req.params.listId as string;
      const inviteIdParam = req.params.inviteId;
      const inviteId = Array.isArray(inviteIdParam) ? parseInt(inviteIdParam[0]) : parseInt(inviteIdParam);
      const user = await storage.getUserByExternalId(authReq.user!.userExternalId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const invite = await storage.getInviteById(inviteId);
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }

      const permissionInfo = await storage.getUserPermissionOnList(user.id, listExternalId);
      const isCreator = invite.createdBy === user.id;
      if (!permissionInfo || (!permissionInfo.isOwner && !isCreator)) {
        return res.status(403).json({ message: "Only the owner or the invite creator can update this invite" });
      }

      const input = api.invites.update.input.parse(req.body);
      const updated = await storage.updateInvite(inviteId, input);
      if (!updated) {
        return res.status(404).json({ message: "Invite not found" });
      }

      res.json(toApiInviteResponse(updated));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Update invite error:", err);
      throw err;
    }
  });

  app.get(api.invites.getByToken.path, async (req, res) => {
    try {
      const token = req.params.token as string;
      const invite = await storage.getInviteByToken(token);

      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }

      if (!invite.isActive) {
        return res.status(404).json({ message: "Invite is no longer active" });
      }

      if (invite.expiresAt && invite.expiresAt < new Date()) {
        return res.status(404).json({ message: "Invite has expired" });
      }

      const memberCount = await storage.getMemberCount(invite.listId);
      const itemCount = await db.select({ count: items.id }).from(items).where(eq(items.listId, invite.listId));

      const isAtCapacity = invite.maxMembers !== null && memberCount >= invite.maxMembers;

      res.json({
        inviteId: invite.externalId,
        listName: invite.list.name,
        listDescription: invite.list.description,
        itemCount: itemCount.length,
        memberCount,
        maxMembers: invite.maxMembers,
        permission: invite.permission,
        message: invite.message,
        expiresAt: invite.expiresAt?.toISOString() || null,
        createdByName: invite.creator.name,
        isExpired: invite.expiresAt ? invite.expiresAt < new Date() : false,
        isAtCapacity,
      });
    } catch (err) {
      console.error("Get invite error:", err);
      throw err;
    }
  });

  app.post(api.invites.accept.path, authenticate, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const token = req.params.token as string;
      const user = await storage.getUserByExternalId(authReq.user!.userExternalId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const invite = await storage.getInviteByToken(token);
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }

      if (!invite.isActive) {
        return res.status(400).json({ message: "Invite is no longer active" });
      }

      if (invite.expiresAt && invite.expiresAt < new Date()) {
        return res.status(400).json({ message: "Invite has expired" });
      }

      const isAlreadyMember = await storage.isUserMemberOrOwner(user.id, invite.list.externalId);
      if (isAlreadyMember) {
        return res.status(400).json({ message: "You are already a member of this list" });
      }

      const memberCount = await storage.getMemberCount(invite.listId);
      if (invite.maxMembers !== null && memberCount >= invite.maxMembers) {
        return res.status(400).json({ message: "List is at capacity" });
      }

      await storage.createMember(invite.listId, user.id, invite.permission, invite.createdBy);

      // Criar progress inicial para o novo membro (pending para todos os itens)
      await storage.createInitialProgressForNewMember(invite.listId, user.id);

      res.json({ listId: invite.list.externalId });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Accept invite error:", err);
      throw err;
    }
  });

  // Member Routes
  app.get(api.members.list.path, authenticate, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const listExternalId = req.params.listId as string;
      const user = await storage.getUserByExternalId(authReq.user!.userExternalId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const isMember = await storage.isUserMemberOrOwner(user.id, listExternalId);
      if (!isMember) {
        return res.status(404).json({ message: "List not found" });
      }

      const members = await storage.getMembersByListId(listExternalId);
      const ownerId = await storage.getListOwnerId(listExternalId);

      const result: Array<{
        externalId: string | null;
        name: string;
        permission: number;
        isOwner: boolean;
        isCurrentUser: boolean;
        joinedAt: string | null;
        invitedByName: string | null;
      }> = await Promise.all(members.map(async (m) => {
        let invitedByName: string | null = null;
        if (m.invitedBy) {
          const inviter = await storage.getUserById(m.invitedBy);
          invitedByName = inviter?.name || null;
        }
        return {
          externalId: m.externalId,
          name: m.user.name,
          permission: m.permission,
          isOwner: m.userId === ownerId,
          isCurrentUser: m.userId === user.id,
          joinedAt: m.createdAt.toISOString(),
          invitedByName,
        };
      }));

      if (ownerId) {
        const owner = await storage.getUserById(ownerId);
        if (owner && !members.some(m => m.userId === ownerId)) {
          result.unshift({
            externalId: null,
            name: owner.name,
            permission: PermissionLevel.ADMIN,
            isOwner: true,
            isCurrentUser: owner.id === user.id,
            joinedAt: null,
            invitedByName: null,
          });
        }
      }

      res.json(result);
    } catch (err) {
      console.error("List members error:", err);
      throw err;
    }
  });

  app.patch(api.members.update.path, authenticate, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const listExternalId = req.params.listId as string;
      const memberExternalId = req.params.userId as string;
      const user = await storage.getUserByExternalId(authReq.user!.userExternalId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const targetListMember = await storage.getListMemberByExternalId(memberExternalId);
      if (!targetListMember) {
        return res.status(404).json({ message: "User not found" });
      }

      const permissionInfo = await storage.getUserPermissionOnList(user.id, listExternalId);
      const isOwner = permissionInfo?.isOwner ?? false;
      const isAdmin = (permissionInfo?.permission ?? 0) >= PermissionLevel.ADMIN;
      
      if (!permissionInfo || (!isOwner && !isAdmin)) {
        return res.status(403).json({ message: "Only the owner or admins can update member permissions" });
      }

      const ownerId = await storage.getListOwnerId(listExternalId);
      if (targetListMember.userId === ownerId) {
        return res.status(400).json({ message: "Cannot change owner permissions" });
      }

      const listId = await storage.getListInternalIdByExternalId(listExternalId);
      if (!listId) {
        return res.status(404).json({ message: "List not found" });
      }

      const input = api.members.update.input.parse(req.body);
      const updated = await storage.updateMemberPermission(listId, targetListMember.userId, input.permission);
      if (!updated) {
        return res.status(404).json({ message: "Member not found" });
      }

      res.json(toApiMemberResponse(updated));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Update member error:", err);
      throw err;
    }
  });

  app.delete(api.members.remove.path, authenticate, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const listExternalId = req.params.listId as string;
      const memberExternalId = req.params.userId as string;
      const user = await storage.getUserByExternalId(authReq.user!.userExternalId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const targetListMember = await storage.getListMemberByExternalId(memberExternalId);
      if (!targetListMember) {
        return res.status(404).json({ message: "User not found" });
      }

      const permissionInfo = await storage.getUserPermissionOnList(user.id, listExternalId);
      if (!permissionInfo) {
        return res.status(404).json({ message: "List not found" });
      }

      const ownerId = await storage.getListOwnerId(listExternalId);
      const isOwner = permissionInfo.isOwner;
      const isAdmin = permissionInfo.permission >= PermissionLevel.ADMIN;
      const isSelfRemoval = user.id === targetListMember.userId;

      if (!isOwner && !isAdmin && !isSelfRemoval) {
        return res.status(403).json({ message: "You can only remove yourself or be removed by the owner or an admin" });
      }

      if (targetListMember.userId === ownerId) {
        return res.status(400).json({ message: "Cannot remove the owner" });
      }

      const listId = await storage.getListInternalIdByExternalId(listExternalId);
      if (!listId) {
        return res.status(404).json({ message: "List not found" });
      }

      await storage.deleteMember(listId, targetListMember.userId);
      res.status(204).send();
    } catch (err) {
      console.error("Remove member error:", err);
      throw err;
    }
  });

  return httpServer;
}
