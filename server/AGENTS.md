# Padrões do Backend

Servidor Express 5 com TypeScript.

## Estrutura

- **Rotas**: `server/routes.ts` - todas as rotas da API
- **Storage**: `server/storage.ts` - camada de acesso a dados
- **Auth**: `server/auth.ts` - autenticação JWT
- **DB**: `server/db.ts` - configuração Drizzle
- **Utils**: `server/utils.ts` - utilitários de resposta

## Exemplo de Rota

```ts
import { api } from "@shared/routes";
import { authenticate, type AuthenticatedRequest } from "./auth";
import { toApiResponse } from "./utils";
import { z } from "zod";

app.post(api.items.create.path, authenticate, async (req, res) => {
  try {
    const input = api.items.create.input.parse(req.body);
    const authReq = req as AuthenticatedRequest;
    
    // Validação de permissão
    const permInfo = await storage.getUserPermissionOnList(user.id, input.listExternalId);
    if (!canEditItems(permInfo.permission)) {
      return res.status(403).json({ message: "You don't have permission" });
    }

    const item = await storage.createItem(input, user.id);
    res.status(201).json(toApiResponse(item));
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        message: err.errors[0].message,
        field: err.errors[0].path.join('.'),
      });
    }
    throw err;
  }
});
```

## Regras

1. Usar rotas de `@shared/routes` para path/method/constants
2. Validar input com Zod schemas de `api.[recurso].input.parse(req.body)`
3. Middleware `authenticate` para rotas protegidas
4. Retornar erros estruturados `{ message, field }`
5. Usar `toApiResponse()` para limpar campos internos (id, userId)
6. Códigos HTTP: 201 (created), 204 (no content), 400, 403, 404
7. Sempre fazer try/catch para ZodError
8. Validar permissões antes de operações
9. Usar `storage` para operações de banco
10. Usar Drizzle ORM para queries
