# Utilitários do Cliente

Funções e configurações auxiliares.

## Utils (lib/utils.ts)

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

## API Client (lib/api.ts)

Funções para chamadas HTTP autenticadas com retry logic.

## Query Client (lib/queryClient.ts)

Configuração global do TanStack Query com opções padrão.

## Regras

1. `cn()` é a utility padrão para classes Tailwind
2. Combina clsx + tailwind-merge para evitar conflitos
3. API client deve incluir autenticação automaticamente
4. Query client com configurações de retry e staleTime
5. Não adicionar credenciais manualmente - o fetch já trata
