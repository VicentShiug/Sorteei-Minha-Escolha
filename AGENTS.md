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
- Create insert schemas using `createInsertSchema()` from drizzle-zod
- Export inferred types: `List`, `InsertList`, `Item`, `InsertItem`

```typescript
export const lists = pgTable("lists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const insertListSchema = createInsertSchema(lists).omit({ id: true });
export type List = typeof lists.$inferSelect;
export type InsertList = z.infer<typeof insertListSchema>;
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

### Endpoints

- `POST /api/auth/register` - Create new user (seeds lists for new users)
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout (invalidates refresh token)
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

### Protected Routes

All `/api/lists/*` and `/api/items/*` routes require authentication via the `authenticate` middleware.

### Frontend Auth

- Use `AuthContext` and `useAuth()` hook from `@/context/AuthContext`
- Routes are protected in `App.tsx` via `ProtectedRoute` component

## Adding New Features

1. **Database schema**: Add table/columns in `shared/schema.ts`
2. **API routes**: Define route structure in `shared/routes.ts`
3. **Server handlers**: Add Express route handlers in `server/routes.ts`
4. **Frontend hooks**: Create TanStack Query hooks in `client/src/hooks/`
5. **UI components**: Add in appropriate location under `client/src/components/`
6. **Types**: Ensure TypeScript types are properly inferred or exported
