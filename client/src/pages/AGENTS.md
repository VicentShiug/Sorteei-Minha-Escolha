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
