import { pgTable, text, boolean, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { baseColumns } from "./table";

export enum PermissionLevel {
  VIEWER = 1,
  EDITOR_LIST = 2,
  EDITOR_ITEMS = 3,
  ADMIN = 4,
}

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
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
});

export const items = pgTable("items", {
  ...baseColumns(),
  listId: integer("list_id").notNull().references(() => lists.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

export const itemProgress = pgTable("item_progress", {
  ...baseColumns(),
  listId: integer("list_id").notNull().references(() => lists.id, { onDelete: "cascade" }),
  itemId: integer("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isSeen: boolean("is_seen").default(false).notNull(),
  rating: integer("rating"),
  review: text("review"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const listInvites = pgTable("list_invites", {
  ...baseColumns(),
  listId: integer("list_id").notNull().references(() => lists.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  permission: integer("permission").notNull().default(PermissionLevel.VIEWER),
  message: text("message"),
  maxMembers: integer("max_members"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdBy: integer("created_by").notNull().references(() => users.id),
  isActive: boolean("is_active").default(true).notNull(),
});

export const listMembers = pgTable("list_members", {
  ...baseColumns(),
  listId: integer("list_id").notNull().references(() => lists.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  permission: integer("permission").notNull().default(PermissionLevel.VIEWER),
  invitedBy: integer("invited_by").references(() => users.id),
});

export const usersRelations = relations(users, ({ many }) => ({
  lists: many(lists),
  refreshTokens: many(refreshTokens),
  listMembers: many(listMembers),
  completedItems: many(items),
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

export const itemsRelations = relations(items, ({ one, many }) => ({
  list: one(lists, {
    fields: [items.listId],
    references: [lists.id],
  }),
  progress: many(itemProgress),
}));

export const itemProgressRelations = relations(itemProgress, ({ one }) => ({
  list: one(lists, {
    fields: [itemProgress.listId],
    references: [lists.id],
  }),
  item: one(items, {
    fields: [itemProgress.itemId],
    references: [items.id],
  }),
  user: one(users, {
    fields: [itemProgress.userId],
    references: [users.id],
  }),
}));

export const listInvitesRelations = relations(listInvites, ({ one }) => ({
  list: one(lists, {
    fields: [listInvites.listId],
    references: [lists.id],
  }),
  creator: one(users, {
    fields: [listInvites.createdBy],
    references: [users.id],
  }),
}));

export const listMembersRelations = relations(listMembers, ({ one }) => ({
  list: one(lists, {
    fields: [listMembers.listId],
    references: [lists.id],
  }),
  user: one(users, {
    fields: [listMembers.userId],
    references: [users.id],
  }),
  inviter: one(users, {
    fields: [listMembers.invitedBy],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({ id: true, externalId: true, createdAt: true });
export const insertRefreshTokenSchema = createInsertSchema(refreshTokens).omit({ id: true, externalId: true, createdAt: true });
export const insertListSchema = createInsertSchema(lists).omit({ id: true, externalId: true, createdAt: true });
export const updateListSchema = createInsertSchema(lists).omit({ id: true, externalId: true, createdAt: true, userId: true }).partial();
export const insertItemSchema = createInsertSchema(items).omit({ id: true, externalId: true, createdAt: true, listId: true }).extend({
  listExternalId: z.string().uuid()
});

export const insertItemProgressSchema = createInsertSchema(itemProgress).omit({ id: true, externalId: true, createdAt: true, listId: true, itemId: true, userId: true, completedAt: true });
export const updateItemProgressSchema = createInsertSchema(itemProgress).omit({ id: true, externalId: true, createdAt: true, listId: true, itemId: true, userId: true }).partial().extend({
  rating: z.coerce.number().min(1).max(5).optional().nullable(),
  review: z.string().optional().nullable(),
  isSeen: z.boolean().optional(),
});

export const insertListInviteSchema = createInsertSchema(listInvites).omit({ id: true, externalId: true, createdAt: true, createdBy: true, isActive: true });
export const updateListInviteSchema = createInsertSchema(listInvites).omit({ id: true, externalId: true, createdAt: true, listId: true, createdBy: true }).partial();

export const insertListMemberSchema = createInsertSchema(listMembers).omit({ id: true, externalId: true, createdAt: true });
export const updateListMemberSchema = createInsertSchema(listMembers).omit({ id: true, externalId: true, createdAt: true, listId: true, userId: true, invitedBy: true }).partial();

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = z.infer<typeof insertRefreshTokenSchema>;

export type List = typeof lists.$inferSelect;
export type InsertList = z.infer<typeof insertListSchema>;

export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;

export type ItemProgress = typeof itemProgress.$inferSelect;
export type InsertItemProgress = z.infer<typeof insertItemProgressSchema>;
export type UpdateItemProgress = z.infer<typeof updateItemProgressSchema>;

export type ListInvite = typeof listInvites.$inferSelect;
export type InsertListInvite = z.infer<typeof insertListInviteSchema>;
export type UpdateListInvite = z.infer<typeof updateListInviteSchema>;

export type ListMember = typeof listMembers.$inferSelect;
export type InsertListMember = z.infer<typeof insertListMemberSchema>;
export type UpdateListMember = z.infer<typeof updateListMemberSchema>;

export type CreateListRequest = InsertList;
export type UpdateListRequest = z.infer<typeof updateListSchema>;

export type CreateItemRequest = InsertItem;
