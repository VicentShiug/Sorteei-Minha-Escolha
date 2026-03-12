# AGENTS.md - Developer Guide for Sorteei Minha Escolha

This document provides guidelines and instructions for agentic coding agents working on this codebase.

## Project Overview

This is a full-stack TypeScript application with:
- **Frontend**: React 18, Vite, TanStack Query, Wouter (routing), Tailwind CSS
- **Backend**: Express 5 with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Validation**: Zod
- **UI**: Radix UI primitives + custom components, Framer Motion animations

## Project Structure

```
/client/src/          # React frontend
  /components/ui/    # Shadcn-style UI components
  /hooks/            # TanStack Query hooks
  /pages/            # Page components
  /lib/              # Utilities (queryClient, utils)
/server/             # Express backend
/shared/             # Shared schemas, types, API route definitions
script/              # Build scripts
```

## Build Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (hot reload) |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run check` | Run TypeScript type checking |
| `npm run db:push` | Push Drizzle schema changes to database |

**There are currently no tests in this project.**

## Path Aliases

The project uses path aliases configured in `tsconfig.json` and `vite.config.ts`:
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`

Use these imports instead of relative paths when possible.

## Code Style Guidelines

### Imports

Organize imports in the following order (blank line between groups):
1. React/Node built-ins
2. External libraries
3. Internal imports (use path aliases `@/` and `@shared/`)

```typescript
// 1. Built-ins
import { useState, useEffect } from "react";
import type { Request, Response, NextFunction } from "express";

// 2. External
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";

// 3. Internal (use @ alias)
import { Button } from "@/components/ui/button";
import { useLists } from "@/hooks/use-lists";
import { api, type ListResponse } from "@shared/routes";
```

### TypeScript

- Always use explicit types for function parameters and return values when not obvious
- Use `z.infer<typeof schema>` for deriving TypeScript types from Zod schemas
- Enable strict mode - do not use `any`

```typescript
// Good
export function useLists() {
  return useQuery<ListResponse[]>({
    queryKey: [api.lists.list.path],
    queryFn: async () => { ... },
  });
}
```

### React Components

- Use default export for page/component files
- Use named exports for hooks and utilities
- Prefer functional components with hooks
- Use `function` declarations (not arrow functions) for components

```typescript
// Page/component - default export
export default function Home() {
  return <div>...</div>;
}

// Hook - named export
export function useLists() {
  // ...
}
```

### Naming Conventions

- **Files**: kebab-case for components (`list-form-dialog.tsx`), camelCase for utilities
- **Components**: PascalCase (`ListFormDialog`)
- **Hooks**: camelCase with `use` prefix (`useLists`, `useItems`)
- **Database tables/columns**: snake_case in DB, camelCase in TypeScript
- **Zod schemas**: descriptive names (`insertListSchema`, `updateItemSchema`)

### Database & ORM

- Use Drizzle ORM with PostgreSQL
- Define schemas in `shared/schema.ts`
- Use `baseColumns()` helper from `shared/table.ts` for standard columns
- Create insert schemas using `createInsertSchema()` from drizzle-zod
- Export inferred types: `List`, `InsertList`, `Item`, `InsertItem`

```typescript
// shared/table.ts - Helper function
export function baseColumns() {
  return {
    id: serial("id").primaryKey(),
    externalId: uuid("external_id").notNull().unique().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  };
}

// shared/schema.ts - Using the helper
export const lists = pgTable("lists", {
  ...baseColumns(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
});

export const insertListSchema = createInsertSchema(lists).omit({ id: true, externalId: true, createdAt: true });
export type List = typeof lists.$inferSelect;
export type InsertList = z.infer<typeof insertListSchema>;
```

### External ID Pattern (Security)

All tables have:
- `id`: Internal serial primary key (never exposed to frontend)
- `externalId`: UUID unique identifier (exposed to frontend via API)

This prevents frontend from knowing internal database IDs.

**API Response Utilities** (`server/utils.ts`):
```typescript
// Removes internal fields from API responses
export function toApiResponse<T>(obj: T): Omit<T, 'id' | 'userId' | 'listId'> {
  const { id, userId, listId, ...rest } = obj;
  return rest;
}

export function toApiListResponse<T>(items: T[]) {
  return items.map((item) => toApiResponse(item));
}
```

**Usage in routes**:
```typescript
// List with nested items
res.json({
  ...toApiResponse(list),
  items: toApiListResponse(list.items)
});

// Single item
res.json(toApiResponse(item));
```

### API Routes

Define routes consistently in `shared/routes.ts`:
- `method`: HTTP method (`GET`, `POST`, `PATCH`, `DELETE`)
- `path`: URL path with params (e.g., `/api/lists/:id`)
- `input`: Zod schema for request validation
- `responses`: Zod schema for each response code

```typescript
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
  },
};
```

### Error Handling

- Use Zod for input validation
- Return structured error responses:
  ```typescript
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      message: err.errors[0].message,
      field: err.errors[0].path.join('.'),
    });
  }
  ```
- Use appropriate HTTP status codes (400, 404, 201, 204)

### Styling (Tailwind CSS)

- Use Tailwind utility classes
- Use semantic color tokens: `bg-background`, `text-foreground`, `bg-primary`, etc.
- Use `cn()` utility (clsx + tailwind-merge) for conditional classes
- Custom shadows defined as `minimal-shadow`, `minimal-shadow-hover`

### UI Components

- Use Radix UI primitives for accessible components
- Follow existing patterns in `client/src/components/ui/`
- Component variants via class-variance-authority (cva)

## Database Management

Run migrations with:
```bash
npm run db:push
```

## Environment Variables

- `NODE_ENV`: `development` or `production`
- `PORT`: Server port (default 5000)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT tokens (optional, defaults to "dev-secret-change-in-production")
- `ACCESS_TOKEN_SECRET`: Secret for access tokens (optional)
- `REFRESH_TOKEN_SECRET`: Secret for refresh tokens (optional)

## Authentication

The app uses JWT-based authentication with access and refresh tokens stored in httpOnly cookies.

### Token Payload

JWT tokens contain `userExternalId` (not internal numeric ID):
```typescript
export interface TokenPayload {
  userExternalId: string;
  email: string;
}
```

### Endpoints

- `POST /api/auth/register` - Create new user (seeds lists for new users), returns `externalId`
- `POST /api/auth/login` - Login with email/password, returns `externalId`
- `POST /api/auth/logout` - Logout (invalidates refresh token)
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user (returns `externalId`)

### Protected Routes

All `/api/lists/*` and `/api/items/*` routes require authentication via the `authenticate` middleware.

### Frontend Auth

- Use `AuthContext` and `useAuth()` hook from `@/context/AuthContext`
- Routes are protected in `App.tsx` via `ProtectedRoute` component
- All ID parameters in URLs are UUID strings (`externalId`), not numeric IDs

### AuthContext States

O `AuthContext` possui os seguintes estados:

| Estado | Descrição |
|--------|-----------|
| `user` | Dados do usuário logado ou `null` |
| `isLoading` | `true` enquanto verifica se há sessão ativa |
| `isAuthenticated` | `true` se há usuário logado (`!!user`) |
| `isProcessing` | `true` durante login/register (usado para evitar redirect automático) |

O `isProcessing` é importante para fluxos onde o Auth precisa fazer redirects condicionais após login (ex: aceitar convite de lista).

## Adding New Features

1. **Database schema**: Add table/columns in `shared/schema.ts`
2. **API routes**: Define route structure in `shared/routes.ts`
3. **Server handlers**: Add Express route handlers in `server/routes.ts`
4. **Frontend hooks**: Create TanStack Query hooks in `client/src/hooks/`
5. **UI components**: Add in appropriate location under `client/src/components/`
6. **Types**: Ensure TypeScript types are properly inferred or exported

## Documentation by Directory

This project contains additional AGENTS.md files in specific directories with detailed patterns:

| File | Description |
|------|-------------|
| `client/src/components/ui/AGENTS.md` | UI Components patterns (Radix UI, CVA, variants) |
| `client/src/components/AGENTS.md` | Business Components patterns (props, hooks, i18n) |
| `client/src/hooks/AGENTS.md` | TanStack Query hooks patterns |
| `client/src/pages/AGENTS.md` | Pages patterns (Wouter, Framer Motion) |
| `client/src/lib/AGENTS.md` | Utilities patterns (cn, api client) |
| `server/AGENTS.md` | Backend patterns (Express routes, middleware) |
| `shared/AGENTS.md` | Shared patterns (Drizzle schema, API routes) |

Consult these files for specific conventions when working in each area.

## Individual Item Progress

Each item's progress is individual per user and stored in the `itemProgress` 
table. Item status is derived from the `completedAt` field:
- `completedAt = null` → item is Pending
- `completedAt != null` → item is Completed

Never store status directly on the item. All completion logic, rating and 
review must operate on `itemProgress`.

When a new member joins a list, automatically create `itemProgress` records 
with `completedAt = null` for all existing items in that list.
When a new item is added to a shared list, automatically create `itemProgress` 
records for all current members.

## Shared List Permissions

The list owner is identified by `lists.userId` — they have no record in 
`listMembers` but have implicit full permission.

Additional members are stored in `listMembers` with one of the levels from 
the `PermissionLevel` enum (VIEWER=1, EDITOR_LIST=2, EDITOR_ITEMS=3, ADMIN=4).

Every route involving an action on a list must verify permissions through a 
centralized helper — never check `ownerId` directly. The helper must consider 
both the owner and members with sufficient permission level.