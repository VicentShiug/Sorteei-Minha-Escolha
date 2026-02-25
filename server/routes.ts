import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Seed Database
  try {
    const allLists = await storage.getLists();
    if (allLists.length === 0) {
      const moviesList = await storage.createList({ name: "Movies to Watch", description: "A list of movies I want to see" });
      await storage.createItem({ listId: moviesList.id, name: "Inception" });
      await storage.createItem({ listId: moviesList.id, name: "Interstellar" });
      await storage.createItem({ listId: moviesList.id, name: "The Matrix" });
      
      const booksList = await storage.createList({ name: "Books to Read", description: "My reading backlog" });
      await storage.createItem({ listId: booksList.id, name: "1984" });
      await storage.createItem({ listId: booksList.id, name: "Brave New World" });
    }
  } catch (error) {
    console.error("Failed to seed database:", error);
  }

  // Lists
  app.get(api.lists.list.path, async (req, res) => {
    const lists = await storage.getLists();
    res.json(lists);
  });

  app.get(api.lists.get.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    
    const list = await storage.getList(id);
    if (!list) {
      return res.status(404).json({ message: 'List not found' });
    }
    res.json(list);
  });

  app.post(api.lists.create.path, async (req, res) => {
    try {
      const input = api.lists.create.input.parse(req.body);
      const list = await storage.createList(input);
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

  app.delete(api.lists.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteList(id);
    res.status(204).send();
  });

  // Items
  app.post(api.items.create.path, async (req, res) => {
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

  app.patch(api.items.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
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

  app.delete(api.items.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteItem(id);
    res.status(204).send();
  });

  return httpServer;
}