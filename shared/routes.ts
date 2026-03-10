import { z } from 'zod';
import { insertListSchema, insertItemSchema, updateListSchema, lists, items, listInvites, listMembers, PermissionLevel, updateItemProgressSchema, itemProgress, Item } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  forbidden: z.object({
    message: z.string(),
  }),
};

const inviteResponseSchema = z.object({
  externalId: z.string().uuid(),
  token: z.string(),
  permission: z.nativeEnum(PermissionLevel),
  message: z.string().nullable(),
  maxMembers: z.number().nullable(),
  expiresAt: z.coerce.date().nullable(),
  createdBy: z.number(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
});

const memberUpdateResponseSchema = z.object({
  externalId: z.string().uuid(),
  permission: z.nativeEnum(PermissionLevel),
  invitedBy: z.number().nullable(),
  createdAt: z.coerce.date(),
});

const itemWithProgressSchema = z.object({
  externalId: z.string().uuid(),
  createdAt: z.coerce.date(),
  listId: z.number(),
  name: z.string(),
  progress: z.object({
    externalId: z.string().uuid(),
    createdAt: z.coerce.date(),
    userId: z.number(),
    isSeen: z.boolean(),
    rating: z.number().nullable(),
    review: z.string().nullable(),
    completedAt: z.coerce.date().nullable(),
  }).optional(),
});

const listWithItemsSchema = z.object({
  externalId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  items: z.array(itemWithProgressSchema),
  userPermission: z.object({
    permission: z.number(),
    isOwner: z.boolean(),
  }).optional(),
});

export const api = {
  lists: {
    list: {
      method: 'GET' as const,
      path: '/api/lists' as const,
      responses: {
        200: z.array(listWithItemsSchema),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/lists/:id' as const,
      responses: {
        200: listWithItemsSchema,
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/lists' as const,
      input: insertListSchema.extend({
        userId: z.number().optional()
      }),
      responses: {
        201: z.custom<typeof lists.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/lists/:id' as const,
      input: updateListSchema,
      responses: {
        200: z.custom<typeof lists.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/lists/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    }
  },
  items: {
    create: {
      method: 'POST' as const,
      path: '/api/items' as const,
      input: insertItemSchema,
      responses: {
        201: z.custom<typeof items.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/items/:id' as const,
      input: z.object({
        name: z.string().optional(),
        isSeen: z.boolean().optional(),
        rating: z.number().min(1).max(5).optional().nullable(),
        review: z.string().optional().nullable(),
      }),
      responses: {
        200: z.object({
          item: z.custom<typeof items.$inferSelect>(),
          progress: z.custom<typeof import('./schema').itemProgress.$inferSelect>().nullable(),
        }),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/items/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    }
  },
  invites: {
    create: {
      method: 'POST' as const,
      path: '/api/lists/:listId/invites' as const,
      input: z.object({
        permission: z.nativeEnum(PermissionLevel).default(PermissionLevel.VIEWER),
        message: z.string().optional(),
        maxMembers: z.number().min(1).optional(),
        expiresAt: z.string().datetime().optional(),
      }),
      responses: {
        201: z.object({
          inviteId: z.string().uuid(),
          token: z.string(),
          url: z.string(),
        }),
        400: errorSchemas.validation,
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/lists/:listId/invites' as const,
      responses: {
        200: z.array(inviteResponseSchema),
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/lists/:listId/invites/:inviteId' as const,
      input: z.object({
        permission: z.nativeEnum(PermissionLevel).optional(),
        message: z.string().optional(),
        maxMembers: z.number().min(1).optional(),
        isActive: z.boolean().optional(),
      }),
      responses: {
        200: memberUpdateResponseSchema,
        400: errorSchemas.validation,
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
    getByToken: {
      method: 'GET' as const,
      path: '/api/invites/:token' as const,
      responses: {
        200: z.object({
          inviteId: z.string().uuid(),
          listName: z.string(),
          listDescription: z.string().nullable(),
          itemCount: z.number(),
          memberCount: z.number(),
          maxMembers: z.number().nullable(),
          permission: z.nativeEnum(PermissionLevel),
          message: z.string().nullable(),
          expiresAt: z.string().nullable(),
          createdByName: z.string(),
          isExpired: z.boolean(),
          isAtCapacity: z.boolean(),
        }),
        404: errorSchemas.notFound,
      },
    },
    accept: {
      method: 'POST' as const,
      path: '/api/invites/:token/accept' as const,
      responses: {
        200: z.object({ listId: z.string().uuid() }),
        400: errorSchemas.validation,
        401: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
  },
  members: {
    list: {
      method: 'GET' as const,
      path: '/api/lists/:listId/members' as const,
      responses: {
        200: z.array(z.object({
          externalId: z.string().nullable().or(z.literal("")),
          userId: z.number(),
          name: z.string(),
          permission: z.nativeEnum(PermissionLevel),
          isOwner: z.boolean(),
          isCurrentUser: z.boolean(),
          joinedAt: z.string(),
          invitedByName: z.string().nullable(),
        })),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/lists/:listId/members/:userId' as const,
      input: z.object({
        permission: z.nativeEnum(PermissionLevel),
      }),
      responses: {
        200: z.custom<typeof listMembers.$inferSelect>(),
        400: errorSchemas.validation,
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
    remove: {
      method: 'DELETE' as const,
      path: '/api/lists/:listId/members/:userId' as const,
      responses: {
        204: z.void(),
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type ListResponse = z.infer<typeof api.lists.create.responses[201]>;
export type ItemResponse = z.infer<typeof api.items.create.responses[201]>;
export type CreateListRequest = z.infer<typeof api.lists.create.input>;
export type UpdateListRequest = z.infer<typeof api.lists.update.input>;
export type CreateItemRequest = z.infer<typeof api.items.create.input>;
export type UpdateItemRequest = z.infer<typeof api.items.update.input>;