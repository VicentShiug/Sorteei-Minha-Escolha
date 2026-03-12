# Padrões de Componentes de Negócio

Componentes específicos da aplicação que implementam funcionalidades de negócio.

## Estrutura

- **Arquivos**: PascalCase (ex: `ItemFormDialog.tsx`)
- **Export**: default para componentes, named para funções utilitárias
- **Props**: interfaces explícitas
- **Estilização**: Tailwind CSS

## Exemplo

```tsx
interface ItemFormDialogProps {
  listExternalId?: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ItemFormDialog({ listExternalId, isOpen, onOpenChange }: ItemFormDialogProps) {
  const [name, setName] = useState("");
  const createItem = useCreateItem();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !listExternalId) return;

    createItem.mutate(
      { name: name.trim(), listExternalId },
      {
        onSuccess: () => {
          toast({ title: t('common.success') });
          setName("");
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) setName("");
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md rounded-2xl border-none minimal-shadow-hover">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{t('listDetails.addItem')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Form content */}
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

## Regras

1. PascalCase para nomes de arquivos e componentes
2. Interface de props explícita
3. Default export para componentes de página, named export para componentes de negócio
4. Usar TanStack Query hooks para dados (useMutation, useQuery)
5. Usar react-i18next para traduções (`t()`)
6. Tailwind com cores semânticas (bg-primary, text-foreground, etc)
7. Importar componentes Radix de `@/components/ui/`
8. Classes customizadas: minimal-shadow, minimal-shadow-hover
9. Border radius: rounded-xl, rounded-2xl, rounded-3xl
10. Arquivos de layout em subpasta `components/layout/`
