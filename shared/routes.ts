import { z } from 'zod';
import { insertListSchema, insertItemSchema, updateItemSchema, lists, items } from './schema';

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
};

const listInputSchema = insertListSchema.extend({
  userId: z.number().optional()
});

export const api = {
  lists: {
    list: {
      method: 'GET' as const,
      path: '/api/lists' as const,
      responses: {
        200: z.array(z.custom<typeof lists.$inferSelect & { items?: typeof items.$inferSelect[] }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/lists/:id' as const,
      responses: {
        200: z.custom<typeof lists.$inferSelect & { items: typeof items.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/lists' as const,
      input: listInputSchema,
      responses: {
        201: z.custom<typeof lists.$inferSelect>(),
        400: errorSchemas.validation,
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
      input: updateItemSchema,
      responses: {
        200: z.custom<typeof items.$inferSelect>(),
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
export type CreateItemRequest = z.infer<typeof api.items.create.input>;
export type UpdateItemRequest = z.infer<typeof api.items.update.input>;
