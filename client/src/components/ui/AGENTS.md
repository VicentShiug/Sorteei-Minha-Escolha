# Padrões de Componentes UI

Este documento descreve os padrões adotados para componentes de interface baseados em Radix UI.

## Estrutura

- **Origem**: Radix UI Primitives
- **Variantes**: class-variance-authority (CVA)
- **Estilização**: Tailwind CSS com `cn()` utility
- **Padrão de Exports**: named exports

## Exemplo de Componente

```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center...",
  {
    variants: {
      variant: {
        default: "bg-primary...",
        destructive: "bg-destructive...",
      },
      size: {
        default: "min-h-9...",
        sm: "min-h-8...",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

## Regras

1. Usar Radix UI como base sempre que possível
2. Definir variantes com CVA
3. Usar `cn()` para merges de classes
4. Exportar componente e variantes
5. Usar forwardRef para ref forwarding
6. Definir interface de props estendendo HTMLAttributes
7. Arquivos em PascalCase (button.tsx, dialog.tsx)
8. Compor componentes com sub-componentes (DialogContent, DialogHeader, etc)
