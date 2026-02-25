import { db } from "./db";
import {
  users, lists, items, refreshTokens,
  type InsertUser, type User,
  type InsertRefreshToken, type RefreshToken,
  type InsertList, type List,
  type InsertItem, type Item,
  type UpdateItemRequest
} from "@shared/schema";
import { eq, and, exists } from "drizzle-orm";
import { hashPassword } from "./auth";

export interface IStorage {
  // Users
  createUser(email: string, password: string, name: string): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;

  // Refresh Tokens
  createRefreshToken(userId: number, token: string, expiresAt: Date): Promise<RefreshToken>;
  getRefreshToken(token: string): Promise<RefreshToken | undefined>;
  deleteRefreshToken(token: string): Promise<void>;
  deleteAllUserRefreshTokens(userId: number): Promise<void>;

  // Lists
  getLists(userId: number): Promise<(List & { items: Item[] })[]>;
  getList(id: number, userId: number): Promise<(List & { items: Item[] }) | undefined>;
  createList(list: InsertList): Promise<List>;
  deleteList(id: number, userId: number): Promise<void>;

  // Items
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: number, updates: UpdateItemRequest): Promise<Item>;
  deleteItem(id: number, listUserId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async createUser(email: string, password: string, name: string): Promise<User> {
    const passwordHash = await hashPassword(password);
    const [newUser] = await db.insert(users).values({
      email,
      passwordHash,
      name,
    }).returning();
    return newUser;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  // Refresh Tokens
  async createRefreshToken(userId: number, token: string, expiresAt: Date): Promise<RefreshToken> {
    const [newToken] = await db.insert(refreshTokens).values({
      userId,
      token,
      expiresAt,
    }).returning();
    return newToken;
  }

  async getRefreshToken(token: string): Promise<RefreshToken | undefined> {
    const [refreshToken] = await db.select().from(refreshTokens).where(eq(refreshTokens.token, token));
    return refreshToken;
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
  }

  async deleteAllUserRefreshTokens(userId: number): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
  }

  // Lists
  async getLists(userId: number): Promise<(List & { items: Item[] })[]> {
    const allLists = await db.query.lists.findMany({
      where: eq(lists.userId, userId),
      with: {
        items: true
      }
    });
    return allLists;
  }

  async getList(id: number, userId: number): Promise<(List & { items: Item[] }) | undefined> {
    const list = await db.query.lists.findFirst({
      where: and(eq(lists.id, id), eq(lists.userId, userId)),
      with: {
        items: true
      }
    });
    return list;
  }

  async createList(list: InsertList): Promise<List> {
    const [newList] = await db.insert(lists).values(list).returning();
    return newList;
  }

  async deleteList(id: number, userId: number): Promise<void> {
    await db.delete(items).where(eq(items.listId, id));
    await db.delete(lists).where(and(eq(lists.id, id), eq(lists.userId, userId)));
  }

  // Items
  async createItem(item: InsertItem): Promise<Item> {
    const [newItem] = await db.insert(items).values(item).returning();
    return newItem;
  }

  async updateItem(id: number, updates: UpdateItemRequest): Promise<Item> {
    const [updated] = await db.update(items)
      .set(updates)
      .where(eq(items.id, id))
      .returning();
    if (!updated) throw new Error("Item not found");
    return updated;
  }

  async deleteItem(id: number, userId: number): Promise<void> {
    const itemList = await db.query.lists.findFirst({
      where: and(
        eq(lists.userId, userId),
        exists(db.select().from(items).where(and(eq(items.id, id), eq(items.listId, lists.id))))
      )
    });
    
    if (!itemList) {
      throw new Error("Item not found");
    }
    
    await db.delete(items).where(eq(items.id, id));
  }
}

export const storage = new DatabaseStorage();
