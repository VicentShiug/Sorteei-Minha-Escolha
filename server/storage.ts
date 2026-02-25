import { db } from "./db";
import {
  lists, items,
  type InsertList, type List,
  type InsertItem, type Item,
  type UpdateItemRequest
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getLists(): Promise<(List & { items: Item[] })[]>;
  getList(id: number): Promise<(List & { items: Item[] }) | undefined>;
  createList(list: InsertList): Promise<List>;
  deleteList(id: number): Promise<void>;
  
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: number, updates: UpdateItemRequest): Promise<Item>;
  deleteItem(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getLists(): Promise<(List & { items: Item[] })[]> {
    const allLists = await db.query.lists.findMany({
      with: {
        items: true
      }
    });
    return allLists;
  }

  async getList(id: number): Promise<(List & { items: Item[] }) | undefined> {
    const list = await db.query.lists.findFirst({
      where: eq(lists.id, id),
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

  async deleteList(id: number): Promise<void> {
    await db.delete(items).where(eq(items.listId, id));
    await db.delete(lists).where(eq(lists.id, id));
  }

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

  async deleteItem(id: number): Promise<void> {
    await db.delete(items).where(eq(items.id, id));
  }
}

export const storage = new DatabaseStorage();