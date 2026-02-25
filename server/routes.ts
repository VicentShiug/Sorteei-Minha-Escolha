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
      
      const accessToken = generateAccessToken({ userId: user.id, email: user.email });
      const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });
      
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await storage.createRefreshToken(user.id, refreshToken, expiresAt);
      
      setAuthCookies(res, accessToken, refreshToken);
      
      // Seed lists for first-time user
      const userLists = await storage.getLists(user.id);
      if (userLists.length === 0) {
        const moviesList = await storage.createList({ userId: user.id, name: "Movies to Watch", description: "A list of movies I want to see" });
        await storage.createItem({ listId: moviesList.id, name: "Inception" });
        await storage.createItem({ listId: moviesList.id, name: "Interstellar" });
        await storage.createItem({ listId: moviesList.id, name: "The Matrix" });
        
        const booksList = await storage.createList({ userId: user.id, name: "Books to Read", description: "My reading backlog" });
        await storage.createItem({ listId: booksList.id, name: "1984" });
        await storage.createItem({ listId: booksList.id, name: "Brave New World" });
      }
      
      res.status(201).json({ id: user.id, email: user.email, name: user.name });
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
      
      const accessToken = generateAccessToken({ userId: user.id, email: user.email });
      const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });
      
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await storage.createRefreshToken(user.id, refreshToken, expiresAt);
      
      setAuthCookies(res, accessToken, refreshToken);
      
      res.json({ id: user.id, email: user.email, name: user.name });
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
      
      const user = await storage.getUserById(payload.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const newAccessToken = generateAccessToken({ userId: user.id, email: user.email });
      const newRefreshToken = generateRefreshToken({ userId: user.id, email: user.email });
      
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await storage.createRefreshToken(user.id, newRefreshToken, expiresAt);
      
      setAuthCookies(res, newAccessToken, newRefreshToken);
      
      res.json({ id: user.id, email: user.email, name: user.name });
    } catch (err) {
      console.error("Refresh error:", err);
      return res.status(401).json({ message: "Invalid refresh token" });
    }
  });

  app.get("/api/auth/me", authenticate, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const user = await storage.getUserById(authReq.user!.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    res.json({ id: user.id, email: user.email, name: user.name });
  });

  // Lists - Protected
  app.get(api.lists.list.path, authenticate, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const lists = await storage.getLists(authReq.user!.userId);
    res.json(lists);
  });

  app.get(api.lists.get.path, authenticate, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    
    const list = await storage.getList(id, authReq.user!.userId);
    if (!list) {
      return res.status(404).json({ message: 'List not found' });
    }
    res.json(list);
  });

  app.post(api.lists.create.path, authenticate, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const input = api.lists.create.input.parse(req.body);
      const list = await storage.createList({ name: input.name, description: input.description, userId: authReq.user!.userId });
      res.status(201).json(list);
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
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteList(id, authReq.user!.userId);
    res.status(204).send();
  });

  // Items - Protected
  app.post(api.items.create.path, authenticate, async (req, res) => {
    try {
      const input = api.items.create.input.parse(req.body);
      const item = await storage.createItem(input);
      res.status(201).json(item);
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
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const input = api.items.update.input.parse(req.body);
      const item = await storage.updateItem(id, input);
      res.json(item);
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
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteItem(id, authReq.user!.userId);
    res.status(204).send();
  });

  return httpServer;
}
