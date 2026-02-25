import { pgTable, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { baseColumns } from "./table";

export const users = pgTable("users", {
  ...baseColumns(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  ...baseColumns(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const lists = pgTable("lists", {
  ...baseColumns(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
});

export const items = pgTable("items", {
  ...baseColumns(),
  listId: integer("list_id").notNull().references(() => lists.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isSeen: boolean("is_seen").default(false).notNull(),
  rating: integer("rating"),
  review: text("review"),
});

export const usersRelations = relations(users, ({ many }) => ({
  lists: many(lists),
  refreshTokens: many(refreshTokens),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const listsRelations = relations(lists, ({ many, one }) => ({
  items: many(items),
  user: one(users, {
    fields: [lists.userId],
    references: [users.id],
  }),
}));

export const itemsRelations = relations(items, ({ one }) => ({
  list: one(lists, {
    fields: [items.listId],
    references: [lists.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({ id: true, externalId: true, createdAt: true });
export const insertRefreshTokenSchema = createInsertSchema(refreshTokens).omit({ id: true, externalId: true, createdAt: true });
export const insertListSchema = createInsertSchema(lists).omit({ id: true, externalId: true, createdAt: true });
export const insertItemSchema = createInsertSchema(items).omit({ id: true, externalId: true, createdAt: true, isSeen: true, rating: true, review: true }).extend({
  listId: z.coerce.number()
});
export const updateItemSchema = createInsertSchema(items).omit({ id: true, externalId: true, createdAt: true, listId: true }).partial().extend({
  rating: z.coerce.number().optional().nullable(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = z.infer<typeof insertRefreshTokenSchema>;

export type List = typeof lists.$inferSelect;
export type InsertList = z.infer<typeof insertListSchema>;

export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;

export type CreateListRequest = InsertList;
export type UpdateListRequest = Partial<InsertList>;

export type CreateItemRequest = InsertItem;
export type UpdateItemRequest = z.infer<typeof updateItemSchema>;
