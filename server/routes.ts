import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  authenticate,
  type AuthenticatedRequest,
  hashPassword,
  verifyPassword
} from "./auth";
import { toApiResponse, toApiListResponse } from "./utils";

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
    res.json({ externalId: user.externalId, email: user.email, name: user.name });
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
      items: toApiListResponse(list.items)
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
      items: toApiListResponse(list.items)
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
      const externalId = req.params.id as string;
      const input = api.items.update.input.parse(req.body);
      const item = await storage.updateItem(externalId, input);
      res.json(toApiResponse(item));
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
    await storage.deleteItem(externalId, user.id);
    res.status(204).send();
  });

  return httpServer;
}
