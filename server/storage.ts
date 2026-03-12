import { db } from "./db";
import {
	users,
	lists,
	items,
	refreshTokens,
	listInvites,
	listMembers,
	itemProgress,
	type InsertUser,
	type User,
	type InsertRefreshToken,
	type RefreshToken,
	type InsertList,
	type List,
	type InsertItem,
	type Item,
	type UpdateListRequest,
	type ListInvite,
	type InsertListInvite,
	type UpdateListInvite,
	type ListMember,
	type InsertListMember,
	type UpdateListMember,
	type ItemProgress,
	PermissionLevel,
} from "@shared/schema";
import { eq, and, or, exists, desc } from "drizzle-orm";
import { hashPassword } from "./auth";

interface ItemWithAllProgress extends Item {
	progress?: ItemProgress;
	participantsProgress: Array<{
		externalId: string;
		name: string;
		completedAt: Date | null;
		rating: number | null;
		review: string | null;
	}>;
}

export interface IStorage {
	// Users
	createUser(email: string, password: string, name: string): Promise<User>;
	getUserByEmail(email: string): Promise<User | undefined>;
	getUserById(id: number): Promise<User | undefined>;
	getUserByExternalId(externalId: string): Promise<User | undefined>;

	// Refresh Tokens
	createRefreshToken(
		userId: number,
		token: string,
		expiresAt: Date,
	): Promise<RefreshToken>;
	getRefreshToken(token: string): Promise<RefreshToken | undefined>;
	deleteRefreshToken(token: string): Promise<void>;
	deleteAllUserRefreshTokens(userId: number): Promise<void>;

	// Lists
	getLists(userId: number): Promise<
		(List & {
			items: (Item & { progress?: ItemProgress })[];
			userPermission: { permission: number; isOwner: boolean };
		})[]
	>;
	getListByExternalId(
		externalId: string,
		userId: number,
	): Promise<
		| (List & {
				items: ItemWithAllProgress[];
				userPermission: { permission: number; isOwner: boolean };
		  })
		| undefined
	>;
	getListIdByExternalId(
		externalId: string,
		userId: number,
	): Promise<number | undefined>;
	getListInternalIdByExternalId(
		externalId: string,
	): Promise<number | undefined>;
	createList(list: InsertList): Promise<List>;
	updateList(
		externalId: string,
		userId: number,
		updates: UpdateListRequest,
	): Promise<List | undefined>;
	deleteList(externalId: string, userId: number): Promise<void>;
	getListOwnerId(listExternalId: string): Promise<number | undefined>;

	// Items
	createItem(
		item: { name: string; listExternalId: string },
		userId: number,
	): Promise<Item>;
	updateItem(
		externalId: string,
		userId: number,
		updates: {
			name?: string;
			isSeen?: boolean;
			rating?: number | null;
			review?: string | null;
		},
	): Promise<{ item: Item; progress: ItemProgress | null }>;
	deleteItem(externalId: string, userId: number): Promise<void>;
	getItemProgress(
		itemExternalId: string,
		userId: number,
	): Promise<ItemProgress | undefined>;
	upsertItemProgress(
		listId: number,
		itemId: number,
		userId: number,
		updates: {
			isSeen?: boolean;
			rating?: number | null;
			review?: string | null;
		},
	): Promise<ItemProgress>;
	createInitialProgressForNewMember(
		listInternalId: number,
		userId: number,
	): Promise<void>;
	createProgressForNewItem(
		listInternalId: number,
		itemId: number,
	): Promise<void>;

	// Members
	getMembersByListId(
		listExternalId: string,
	): Promise<(ListMember & { user: User })[]>;
	getListMemberByExternalId(
		memberExternalId: string,
	): Promise<ListMember | undefined>;
	getMemberByUserAndList(
		userId: number,
		listInternalId: number,
	): Promise<ListMember | undefined>;
	isUserMemberOrOwner(userId: number, listExternalId: string): Promise<boolean>;
	getUserPermissionOnList(
		userId: number,
		listExternalId: string,
	): Promise<{ permission: number; isOwner: boolean } | null>;
	createMember(
		listInternalId: number,
		userId: number,
		permission: number,
		invitedBy: number | null,
	): Promise<ListMember>;
	updateMemberPermission(
		listInternalId: number,
		userId: number,
		permission: number,
	): Promise<ListMember | undefined>;
	deleteMember(listInternalId: number, userId: number): Promise<void>;
	getMemberCount(listInternalId: number): Promise<number>;

	// Invites
	createInvite(invite: {
		token: string;
		listId: number;
		permission: number;
		message?: string | null;
		maxMembers?: number | null;
		expiresAt?: Date | null;
		createdBy: number;
		isActive?: boolean;
	}): Promise<ListInvite>;
	getInviteByToken(
		token: string,
	): Promise<(ListInvite & { list: List; creator: User }) | undefined>;
	getInviteById(inviteId: number): Promise<ListInvite | undefined>;
	getInvitesByListId(listInternalId: number): Promise<ListInvite[]>;
	updateInvite(
		inviteId: number,
		updates: UpdateListInvite,
	): Promise<ListInvite | undefined>;
	deleteInvite(inviteId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
	// Users
	async createUser(
		email: string,
		password: string,
		name: string,
	): Promise<User> {
		const passwordHash = await hashPassword(password);
		const [newUser] = await db
			.insert(users)
			.values({
				email,
				passwordHash,
				name,
			})
			.returning();
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
		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.externalId, externalId));
		return user;
	}

	// Refresh Tokens
	async createRefreshToken(
		userId: number,
		token: string,
		expiresAt: Date,
	): Promise<RefreshToken> {
		const [newToken] = await db
			.insert(refreshTokens)
			.values({
				userId,
				token,
				expiresAt,
			})
			.returning();
		return newToken;
	}

	async getRefreshToken(token: string): Promise<RefreshToken | undefined> {
		const [refreshToken] = await db
			.select()
			.from(refreshTokens)
			.where(eq(refreshTokens.token, token));
		return refreshToken;
	}

	async deleteRefreshToken(token: string): Promise<void> {
		await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
	}

	async deleteAllUserRefreshTokens(userId: number): Promise<void> {
		await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
	}

	async getLists(userId: number): Promise<
		(List & {
			items: (Item & { progress?: ItemProgress })[];
			userPermission: { permission: number; isOwner: boolean };
		})[]
	> {
		const allLists = await db
			.select()
			.from(lists)
			.leftJoin(
				listMembers,
				and(eq(lists.id, listMembers.listId), eq(listMembers.userId, userId)),
			)
			.where(or(eq(lists.userId, userId), eq(listMembers.userId, userId)));

		const uniqueListsMap = new Map<
			number,
			List & {
				items: (Item & { progress?: ItemProgress })[];
				userPermission: { permission: number; isOwner: boolean };
			}
		>();

		for (const row of allLists) {
			if (!uniqueListsMap.has(row.lists.id)) {
				const listItems = await db
					.select()
					.from(items)
					.where(eq(items.listId, row.lists.id));

				const itemsWithProgress = await Promise.all(
					listItems.map(async (item) => {
						const [progress] = await db
							.select()
							.from(itemProgress)
							.where(
								and(
									eq(itemProgress.itemId, item.id),
									eq(itemProgress.userId, userId),
								),
							);
						return { ...item, progress: progress ?? undefined };
					}),
				);

				const perm = await this.getUserPermissionOnList(
					userId,
					row.lists.externalId,
				);

				uniqueListsMap.set(row.lists.id, {
					...row.lists,
					items: itemsWithProgress,
					userPermission: perm || {
						permission: PermissionLevel.VIEWER,
						isOwner: false,
					},
				});
			}
		}

		return Array.from(uniqueListsMap.values());
	}

	async getListByExternalId(
		externalId: string,
		userId: number,
	): Promise<
		| (List & {
				items: ItemWithAllProgress[];
				userPermission: { permission: number; isOwner: boolean };
		  })
		| undefined
	> {
		const [list] = await db
			.select()
			.from(lists)
			.where(eq(lists.externalId, externalId));

		if (!list) return undefined;

		const perm = await this.getUserPermissionOnList(userId, externalId);
		if (!perm) return undefined;

		const listItems = await db
			.select()
			.from(items)
			.where(eq(items.listId, list.id));

		const members = await db
			.select()
			.from(listMembers)
			.leftJoin(users, eq(listMembers.userId, users.id))
			.where(eq(listMembers.listId, list.id));

		const memberUsers = members.map((m) => ({
			id: m.list_members.userId,
			externalId: m.list_members.externalId,
			name: m.users?.name ?? "",
		}));

		const ownerUser =
			list.userId !== userId
				? { id: list.userId, externalId: null as string | null, name: "" }
				: null;
		const owner = await this.getUserById(list.userId);
		const ownerData = owner
			? { id: owner.id, externalId: owner.externalId, name: owner.name }
			: null;

		const allParticipants = [...(ownerData ? [ownerData] : []), ...memberUsers];

		const itemsWithAllProgress = await Promise.all(
			listItems.map(async (item) => {
				const allProgress = await db
					.select()
					.from(itemProgress)
					.innerJoin(users, eq(itemProgress.userId, users.id))
					.where(eq(itemProgress.itemId, item.id));

				const userProgress = allProgress.find(
					(p) => p.item_progress.userId === userId,
				);

				const currentUser = await this.getUserById(userId);
				const currentUserExternalId = currentUser?.externalId;

				const participantsProgress = allProgress
					.filter((p) => p.users.externalId !== currentUserExternalId)
					.map((p) => ({
						externalId: p.users.externalId,
						name: p.users.name,
						completedAt: p.item_progress.completedAt,
						rating: p.item_progress.rating,
						review: p.item_progress.review,
					}));

				console.log(participantsProgress);

				return {
					...item,
					progress: userProgress?.item_progress,
					participantsProgress,
				};
			}),
		);

		return {
			...list,
			items: itemsWithAllProgress,
			userPermission: perm,
		};
	}

	async getListIdByExternalId(
		externalId: string,
		userId: number,
	): Promise<number | undefined> {
		const [list] = await db
			.select({ id: lists.id, userId: lists.userId })
			.from(lists)
			.where(eq(lists.externalId, externalId));

		if (!list) return undefined;

		// Usuário é owner
		if (list.userId === userId) return list.id;

		// Verificar se usuário é membro
		const member = await this.getMemberByUserAndList(userId, list.id);
		return member ? list.id : undefined;
	}

	async createList(list: InsertList): Promise<List> {
		const [newList] = await db.insert(lists).values(list).returning();
		return newList;
	}

	async updateList(
		externalId: string,
		userId: number,
		updates: UpdateListRequest,
	): Promise<List | undefined> {
		const list = await db.query.lists.findFirst({
			where: and(eq(lists.externalId, externalId), eq(lists.userId, userId)),
		});
		if (!list) return undefined;

		const [updated] = await db
			.update(lists)
			.set(updates)
			.where(eq(lists.id, list.id))
			.returning();
		return updated;
	}

	async deleteList(externalId: string, userId: number): Promise<void> {
		const list = await db.query.lists.findFirst({
			where: and(eq(lists.externalId, externalId), eq(lists.userId, userId)),
		});
		if (!list) return;

		await db.delete(items).where(eq(items.listId, list.id));
		await db.delete(lists).where(eq(lists.id, list.id));
	}

	// Items
	async createItem(
		item: { name: string; listExternalId: string },
		userId: number,
	): Promise<Item> {
		const listId = await this.getListIdByExternalId(
			item.listExternalId,
			userId,
		);
		if (!listId) throw new Error("List not found");

		const [newItem] = await db
			.insert(items)
			.values({ name: item.name, listId })
			.returning();

		// Criar progress para todos os membros existentes
		await this.createProgressForNewItem(listId, newItem.id);

		return newItem;
	}

	async updateItem(
		externalId: string,
		userId: number,
		updates: {
			name?: string;
			isSeen?: boolean;
			rating?: number | null;
			review?: string | null;
		},
	): Promise<{ item: Item; progress: ItemProgress | null }> {
		const item = await db.query.items.findFirst({
			where: eq(items.externalId, externalId),
		});
		if (!item) throw new Error("Item not found");

		let updatedItem = item;

		// Atualiza nome do item se fornecido
		if (updates.name !== undefined) {
			const [updated] = await db
				.update(items)
				.set({ name: updates.name })
				.where(eq(items.id, item.id))
				.returning();
			updatedItem = updated;
		}

		// Upsert progress se fornecido
		let progress: ItemProgress | null = null;
		if (
			updates.isSeen !== undefined ||
			updates.rating !== undefined ||
			updates.review !== undefined
		) {
			progress = await this.upsertItemProgress(item.listId, item.id, userId, {
				isSeen: updates.isSeen,
				rating: updates.rating,
				review: updates.review,
			});
		} else {
			// Buscar progress existente
			const existingProgress = await this.getItemProgress(externalId, userId);
			progress = existingProgress ?? null;
		}

		return { item: updatedItem, progress };
	}

	async getItemProgress(
		itemExternalId: string,
		userId: number,
	): Promise<ItemProgress | undefined> {
		const item = await db.query.items.findFirst({
			where: eq(items.externalId, itemExternalId),
		});
		if (!item) return undefined;

		const [progress] = await db
			.select()
			.from(itemProgress)
			.where(
				and(eq(itemProgress.itemId, item.id), eq(itemProgress.userId, userId)),
			);
		return progress;
	}

	async upsertItemProgress(
		listId: number,
		itemId: number,
		userId: number,
		updates: {
			isSeen?: boolean;
			rating?: number | null;
			review?: string | null;
		},
	): Promise<ItemProgress> {
		const existing = await db
			.select()
			.from(itemProgress)
			.where(
				and(eq(itemProgress.itemId, itemId), eq(itemProgress.userId, userId)),
			);

		if (existing.length > 0) {
			const [updated] = await db
				.update(itemProgress)
				.set({
					...updates,
					...(updates.isSeen === true ? { completedAt: new Date() } : {}),
				})
				.where(eq(itemProgress.id, existing[0].id))
				.returning();
			return updated;
		}

		const [created] = await db
			.insert(itemProgress)
			.values({
				listId,
				itemId,
				userId,
				isSeen: updates.isSeen ?? false,
				rating: updates.rating ?? null,
				review: updates.review ?? null,
				completedAt: updates.isSeen === true ? new Date() : null,
			})
			.returning();
		return created;
	}

	async createInitialProgressForNewMember(
		listInternalId: number,
		userId: number,
	): Promise<void> {
		const listItems = await db
			.select()
			.from(items)
			.where(eq(items.listId, listInternalId));

		for (const item of listItems) {
			await db.insert(itemProgress).values({
				listId: listInternalId,
				itemId: item.id,
				userId,
				isSeen: false,
			});
		}
	}

	async createProgressForNewItem(
		listInternalId: number,
		itemId: number,
	): Promise<void> {
		// Get all members
		const members = await db
			.select()
			.from(listMembers)
			.where(eq(listMembers.listId, listInternalId));

		for (const member of members) {
			await db.insert(itemProgress).values({
				listId: listInternalId,
				itemId,
				userId: member.userId,
				isSeen: false,
			});
		}

		// Also create progress for the owner
		const [list] = await db
			.select({ userId: lists.userId })
			.from(lists)
			.where(eq(lists.id, listInternalId));
		if (list) {
			await db.insert(itemProgress).values({
				listId: listInternalId,
				itemId,
				userId: list.userId,
				isSeen: false,
			});
		}
	}

	async deleteItem(externalId: string, userId: number): Promise<void> {
		const item = await db.query.items.findFirst({
			where: eq(items.externalId, externalId),
		});

		if (!item) {
			throw new Error("Item not found");
		}

		const list = await db.query.lists.findFirst({
			where: and(eq(lists.id, item.listId), eq(lists.userId, userId)),
		});

		if (!list) {
			throw new Error("Item not found");
		}

		// Progress será deletado em cascade
		await db.delete(items).where(eq(items.id, item.id));
	}

	// Lists - additional methods
	async getListInternalIdByExternalId(
		externalId: string,
	): Promise<number | undefined> {
		const [list] = await db
			.select({ id: lists.id })
			.from(lists)
			.where(eq(lists.externalId, externalId));
		return list?.id;
	}

	async getListOwnerId(listExternalId: string): Promise<number | undefined> {
		const [list] = await db
			.select({ userId: lists.userId })
			.from(lists)
			.where(eq(lists.externalId, listExternalId));
		return list?.userId;
	}

	// Members
	async getMembersByListId(
		listExternalId: string,
	): Promise<(ListMember & { user: User })[]> {
		const listId = await this.getListInternalIdByExternalId(listExternalId);
		if (!listId) return [];

		const members = await db
			.select()
			.from(listMembers)
			.leftJoin(users, eq(listMembers.userId, users.id))
			.where(eq(listMembers.listId, listId));

		return members.map((m) => ({
			...m.list_members,
			user: m.users!,
		}));
	}

	async getListMemberByExternalId(
		memberExternalId: string,
	): Promise<ListMember | undefined> {
		const [member] = await db
			.select()
			.from(listMembers)
			.where(eq(listMembers.externalId, memberExternalId));
		return member;
	}

	async getMemberByUserAndList(
		userId: number,
		listInternalId: number,
	): Promise<ListMember | undefined> {
		const [member] = await db
			.select()
			.from(listMembers)
			.where(
				and(
					eq(listMembers.userId, userId),
					eq(listMembers.listId, listInternalId),
				),
			);
		return member;
	}

	async isUserMemberOrOwner(
		userId: number,
		listExternalId: string,
	): Promise<boolean> {
		const ownerId = await this.getListOwnerId(listExternalId);
		if (ownerId === userId) return true;

		const listId = await this.getListInternalIdByExternalId(listExternalId);
		if (!listId) return false;

		const member = await this.getMemberByUserAndList(userId, listId);
		return !!member;
	}

	async getUserPermissionOnList(
		userId: number,
		listExternalId: string,
	): Promise<{ permission: number; isOwner: boolean } | null> {
		const ownerId = await this.getListOwnerId(listExternalId);
		if (ownerId === userId) {
			return { permission: PermissionLevel.ADMIN, isOwner: true };
		}

		const listId = await this.getListInternalIdByExternalId(listExternalId);
		if (!listId) return null;

		const member = await this.getMemberByUserAndList(userId, listId);
		if (!member) return null;

		return { permission: member.permission, isOwner: false };
	}

	async createMember(
		listInternalId: number,
		userId: number,
		permission: number,
		invitedBy: number | null,
	): Promise<ListMember> {
		const [member] = await db
			.insert(listMembers)
			.values({
				listId: listInternalId,
				userId,
				permission,
				invitedBy,
			})
			.returning();
		return member;
	}

	async updateMemberPermission(
		listInternalId: number,
		userId: number,
		permission: number,
	): Promise<ListMember | undefined> {
		const [updated] = await db
			.update(listMembers)
			.set({ permission })
			.where(
				and(
					eq(listMembers.listId, listInternalId),
					eq(listMembers.userId, userId),
				),
			)
			.returning();
		return updated;
	}

	async deleteMember(listInternalId: number, userId: number): Promise<void> {
		await db
			.delete(listMembers)
			.where(
				and(
					eq(listMembers.listId, listInternalId),
					eq(listMembers.userId, userId),
				),
			);
	}

	async getMemberCount(listInternalId: number): Promise<number> {
		const result = await db
			.select({ count: listMembers.id })
			.from(listMembers)
			.where(eq(listMembers.listId, listInternalId));
		return result.length;
	}

	// Invites
	async createInvite(invite: {
		token: string;
		listId: number;
		permission: number;
		message?: string | null;
		maxMembers?: number | null;
		expiresAt?: Date | null;
		createdBy: number;
		isActive?: boolean;
	}): Promise<ListInvite> {
		const [newInvite] = await db
			.insert(listInvites)
			.values({
				token: invite.token,
				listId: invite.listId,
				permission: invite.permission,
				message: invite.message ?? null,
				maxMembers: invite.maxMembers ?? null,
				expiresAt: invite.expiresAt ?? null,
				createdBy: invite.createdBy,
				isActive: invite.isActive ?? true,
			})
			.returning();
		return newInvite;
	}

	async getInviteByToken(
		token: string,
	): Promise<(ListInvite & { list: List; creator: User }) | undefined> {
		const [invite] = await db
			.select()
			.from(listInvites)
			.innerJoin(lists, eq(listInvites.listId, lists.id))
			.innerJoin(users, eq(listInvites.createdBy, users.id))
			.where(eq(listInvites.token, token));

		if (!invite) return undefined;

		return {
			...invite.list_invites,
			list: invite.lists,
			creator: invite.users,
		};
	}

	async getInviteById(inviteId: number): Promise<ListInvite | undefined> {
		const [invite] = await db
			.select()
			.from(listInvites)
			.where(eq(listInvites.id, inviteId));
		return invite;
	}

	async getInvitesByListId(listInternalId: number): Promise<ListInvite[]> {
		return db
			.select()
			.from(listInvites)
			.where(eq(listInvites.listId, listInternalId));
	}

	async updateInvite(
		inviteId: number,
		updates: UpdateListInvite,
	): Promise<ListInvite | undefined> {
		const [updated] = await db
			.update(listInvites)
			.set(updates)
			.where(eq(listInvites.id, inviteId))
			.returning();
		return updated;
	}

	async deleteInvite(inviteId: number): Promise<void> {
		await db.delete(listInvites).where(eq(listInvites.id, inviteId));
	}
}

export const storage = new DatabaseStorage();
