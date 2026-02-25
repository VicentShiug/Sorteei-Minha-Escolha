import { pgTable, text, serial, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const lists = pgTable("lists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  listId: integer("list_id").notNull().references(() => lists.id),
  name: text("name").notNull(),
  isSeen: boolean("is_seen").default(false).notNull(),
  rating: integer("rating"),
  review: text("review"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const listsRelations = relations(lists, ({ many }) => ({
  items: many(items),
}));

export const itemsRelations = relations(items, ({ one }) => ({
  list: one(lists, {
    fields: [items.listId],
    references: [lists.id],
  }),
}));

export const insertListSchema = createInsertSchema(lists).omit({ id: true, createdAt: true });
export const insertItemSchema = createInsertSchema(items).omit({ id: true, createdAt: true, isSeen: true, rating: true, review: true }).extend({
  listId: z.coerce.number()
});
export const updateItemSchema = createInsertSchema(items).omit({ id: true, createdAt: true, listId: true }).partial().extend({
  rating: z.coerce.number().optional().nullable(),
});

export type List = typeof lists.$inferSelect;
export type InsertList = z.infer<typeof insertListSchema>;

export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;

export type CreateListRequest = InsertList;
export type UpdateListRequest = Partial<InsertList>;

export type CreateItemRequest = InsertItem;
export type UpdateItemRequest = z.infer<typeof updateItemSchema>;
