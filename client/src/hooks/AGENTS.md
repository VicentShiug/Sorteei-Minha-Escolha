# Padrões de Hooks

Hooks para fetching de dados usando TanStack Query.

## Estrutura

- **Arquivos**: camelCase (ex: `use-items.ts`)
- **Export**: named exports
- **Prefixo**: `use` para todos os hooks

## Exemplo

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateItemRequest } from "@shared/routes";
import { fetchWithAuthRetry } from "@/lib/api";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateItemRequest) => {
      const validated = api.items.create.input.parse(data);
      const res = await fetchWithAuthRetry(api.items.create.path, {
        method: api.items.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const err = await res.json();
          throw new Error(err.message || "Validation failed");
        }
        throw new Error("Failed to create item");
      }
      
      const responseData = await res.json();
      return parseWithLogging(api.items.create.responses[201], responseData, "items.create");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.lists.get.path, variables.listExternalId] });
    },
  });
}
```

## Regras

1. camelCase para nomes de arquivos
2. Named exports (não default)
3. Prefixo `use` em todos os hooks
4. Usar TanStack Query (useQuery, useMutation)
5. Validar dados com Zod usando schemas de `@shared/routes`
6. Usar `fetchWithAuthRetry` para chamadas API autenticadas
7. Invalidar queries relevantes no `onSuccess`
8. Tipos definidos em `@shared/routes` (CreateItemRequest, etc)
9. Usar `buildUrl` para construir URLs com parâmetros dinâmicos
10. Tratar erros com mensagens significativas
