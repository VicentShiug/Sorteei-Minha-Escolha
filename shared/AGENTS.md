# Padrões Compartilhados

Definições de schema de banco de dados, tipos e rotas de API compartilhados entre cliente e servidor.

## Schema (shared/schema.ts)

```ts
import { pgTable, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { baseColumns } from "./table";

export const lists = pgTable("lists", {
  ...baseColumns(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
});

export const insertListSchema = createInsertSchema(lists).omit({ 
  id: true, 
  externalId: true, 
  createdAt: true 
});

export type List = typeof lists.$inferSelect;
export type InsertList = z.infer<typeof insertListSchema>;
```

## Routes (shared/routes.ts)

```ts
export const api = {
  lists: {
    create: {
      method: 'POST' as const,
      path: '/api/lists' as const,
      input: insertListSchema,
      responses: {
        201: z.custom<typeof lists.$inferSelect>(),
        400: errorSchemas.validation,
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
  },
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

export type CreateListRequest = z.infer<typeof api.lists.create.input>;
```

## Table Helper (shared/table.ts)

```ts
export function baseColumns() {
  return {
    id: serial("id").primaryKey(),
    externalId: uuid("external_id").notNull().unique().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  };
}
```

## Regras

### Schema

1. Usar Drizzle ORM com PostgreSQL
2. Toda tabela tem `id` (serial, interno) e `externalId` (UUID, exposto via API)
3. Usar `baseColumns()` para colunas padrão
4. Usar `createInsertSchema()` para validação Zod
5. Inferir tipos com `$inferSelect` (select) e `z.infer` (insert)
6. Definir relações com `relations()` do Drizzle
7. Nomes de colunas em snake_case no DB, camelCase no código

### Routes

1. API routes centralizadas com Zod para input/responses
2. Usar `method as const` para tipagem correta
3. Usar `:param` para parâmetros dinâmicos
4. Tipos de resposta definidos com `z.custom<typeof table.$inferSelect>()`
5. `buildUrl()` para construir URLs com parâmetros
6. Exportar tiposRequest para uso no cliente
7. Schema de erro padrão em `errorSchemas`

### Nomenclatura

- Arquivos: kebab-case (schema.ts, routes.ts, table.ts)
- Tabelas: snake_case no DB (lists, items, list_members)
- Schemas: insertSchema, updateSchema (camelCase)
- Tipos: PascalCase (List, InsertList, ListResponse)
