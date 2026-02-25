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
  getUserByExternalId(externalId: string): Promise<User | undefined>;

  // Refresh Tokens
  createRefreshToken(userId: number, token: string, expiresAt: Date): Promise<RefreshToken>;
  getRefreshToken(token: string): Promise<RefreshToken | undefined>;
  deleteRefreshToken(token: string): Promise<void>;
  deleteAllUserRefreshTokens(userId: number): Promise<void>;

  // Lists
  getLists(userId: number): Promise<(List & { items: Item[] })[]>;
  getListByExternalId(externalId: string, userId: number): Promise<(List & { items: Item[] }) | undefined>;
  createList(list: InsertList): Promise<List>;
  deleteList(externalId: string, userId: number): Promise<void>;

  // Items
  createItem(item: InsertItem): Promise<Item>;
  updateItem(externalId: string, updates: UpdateItemRequest): Promise<Item>;
  deleteItem(externalId: string, userId: number): Promise<void>;
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

  async getUserByExternalId(externalId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.externalId, externalId));
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

  async getListByExternalId(externalId: string, userId: number): Promise<(List & { items: Item[] }) | undefined> {
    const list = await db.query.lists.findFirst({
      where: and(eq(lists.externalId, externalId), eq(lists.userId, userId)),
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

  async deleteList(externalId: string, userId: number): Promise<void> {
    const list = await db.query.lists.findFirst({
      where: and(eq(lists.externalId, externalId), eq(lists.userId, userId))
    });
    if (!list) return;
    
    await db.delete(items).where(eq(items.listId, list.id));
    await db.delete(lists).where(eq(lists.id, list.id));
  }

  // Items
  async createItem(item: InsertItem): Promise<Item> {
    const [newItem] = await db.insert(items).values(item).returning();
    return newItem;
  }

  async updateItem(externalId: string, updates: UpdateItemRequest): Promise<Item> {
    const item = await db.query.items.findFirst({
      where: eq(items.externalId, externalId)
    });
    if (!item) throw new Error("Item not found");
    
    const [updated] = await db.update(items)
      .set(updates)
      .where(eq(items.id, item.id))
      .returning();
    return updated;
  }

  async deleteItem(externalId: string, userId: number): Promise<void> {
    const item = await db.query.items.findFirst({
      where: eq(items.externalId, externalId)
    });
    
    if (!item) {
      throw new Error("Item not found");
    }

    const list = await db.query.lists.findFirst({
      where: and(
        eq(lists.id, item.listId),
        eq(lists.userId, userId)
      )
    });
    
    if (!list) {
      throw new Error("Item not found");
    }
    
    await db.delete(items).where(eq(items.id, item.id));
  }
}

export const storage = new DatabaseStorage();
