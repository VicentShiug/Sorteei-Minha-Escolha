# Padrões de Páginas

Componentes de página que correspondem a rotas.

## Estrutura

- **Arquivos**: PascalCase (ex: `Home.tsx`, `ListDetails.tsx`)
- **Export**: default
- **Rotas**: Wouter (routing)

## Exemplo

```tsx
import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLists, useDeleteList } from "@/hooks/use-lists";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { data: lists, isLoading } = useLists();
  const deleteList = useDeleteList();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 pt-16">
      <header className="pt-12 pb-12 px-6 sm:px-12 max-w-7xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight">
          {t("home.title")}
        </h1>
      </header>
      <main className="px-6 sm:px-12 max-w-7xl mx-auto">
        {isLoading ? (
          /* Loading state */
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Page content */}
          </motion.div>
        )}
      </main>
    </div>
  );
}
```

## Regras

1. PascalCase para nomes de arquivos
2. Default export
3. Usar Wouter para routing (`useLocation`, `Link`)
4. Usar Framer Motion para animações (`motion.div`, `AnimatePresence`)
5. Usar react-i18next para traduções
6. Iniciar estado com `useState`
7. Fetching de dados via TanStack Query hooks
8. Tailwind para estilização
9. Classes de layout: min-h-screen, pt-16, pb-20, max-w-7xl, mx-auto
10. Tipos para dados complexos definidos no arquivo

## Fluxo de Convite de Lista Compartilhada

Quando um usuário acessa um link de convite (`/invite/:token`), o comportamento é diferente dependendo se está logado ou não:

### Estrutura de Arquivos

- **Invite.tsx**: Página de visualização do convite (rota `/invite/:token`)
- **Auth.tsx**: Página de login/register (rota `/auth`)

### SessionStorage

O projeto usa `sessionStorage` para passar parâmetros entre páginas quando o usuário precisa fazer login:

```typescript
// Chave usada para armazenar os parâmetros
const AUTH_PARAMS_KEY = "authParams";

// Estrutura dos parâmetros
interface AuthParams {
  inviteToken?: string;
  action?: string;
}
```

### Fluxo 1: Usuário Logado

1. **Invite.tsx**: Usuário clica em "Accept Invite"
   - O `onAccept` detecta `isAuthenticated === true`
   - Executa `handleAccept()` diretamente
   - Faz POST para `/api/invites/{token}/accept`
   - Redirect para `/` (home)

### Fluxo 2: Usuário Deslogado

1. **Invite.tsx**: Usuário clica em "Accept Invite"
   - O `onAccept` detecta `isAuthenticated === false`
   - Salva no sessionStorage: `sessionStorage.setItem("authParams", JSON.stringify({ inviteToken: token, action: "accept" }))`
   - Redirect para `/auth`

2. **Auth.tsx**: Usuário faz login/register
   - Após sucesso do login, verifica sessionStorage
   - Se `authParams.action === "accept"`, faz POST para `/api/invites/${inviteToken}/accept`
   - Remove os parâmetros do sessionStorage
   - Redirect para `/` (home)

3. **Home**: Lista atualizada com o novo membro

### Exemplo de Implementação

**Invite.tsx:**
```typescript
const handleAccept = async () => {
  setIsAccepting(true);
  try {
    await acceptInvite.mutateAsync(token);
    setLocation("/");
  } catch (err) {
    console.error("Failed to accept invite:", err);
  } finally {
    setIsAccepting(false);
  }
};

const onAccept = () => {
  if (isAuthenticated) {
    handleAccept();
  } else {
    const authParams = JSON.stringify({ inviteToken: token, action: "accept" });
    sessionStorage.setItem("authParams", authParams);
    setLocation("/auth");
  }
};
```

**Auth.tsx (após login):**
```typescript
const authParams = JSON.parse(sessionStorage.getItem("authParams") || "{}");

if (authParams.inviteToken && authParams.action === "accept") {
  await fetch(`/api/invites/${authParams.inviteToken}/accept`, {
    method: "POST",
    credentials: "include",
  });
  sessionStorage.removeItem("authParams");
}

setLocation("/");
```

### Importante

- O Router (App.tsx) usa `isProcessing` no AuthContext para evitar redirect automático para `/` enquanto o login está em processamento
- O fluxo de Decline apenas redireciona para home (sem API call)
