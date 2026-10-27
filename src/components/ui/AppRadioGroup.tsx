import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef, type ReactNode } from "react";
import { RadioGroup } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * AppRadioGroup — grupo de opções exclusivas (setas movem a seleção; Tab entra/sai do grupo).
 * Sempre passe `aria-label` (ou `aria-labelledby`) descrevendo o grupo.
 */
export const AppRadioGroup = forwardRef<ComponentRef<typeof RadioGroup.Root>, ComponentPropsWithoutRef<typeof RadioGroup.Root>>(
  ({ className, ...props }, ref) => <RadioGroup.Root ref={ref} className={cn("grid gap-3", className)} {...props} />,
);
AppRadioGroup.displayName = "AppRadioGroup";

/** Círculo do rádio (anel + ponto), reutilizado pelo card. */
function RadioDot() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-primary group-data-[state=checked]:bg-transparent"
    >
      <span className="hidden size-2.5 rounded-full bg-primary group-data-[state=checked]:block" />
    </span>
  );
}

export interface AppRadioCardProps extends Omit<ComponentPropsWithoutRef<typeof RadioGroup.Item>, "children" | "title"> {
  title: ReactNode;
  /** Linhas secundárias (endereço, rede…). */
  description?: ReactNode;
  /** Ícone/monograma à esquerda do texto (ex.: "M" da MetaMask). */
  icon?: ReactNode;
  /** Conteúdo à direita (ex.: menu ⋮). */
  trailing?: ReactNode;
}

/**
 * AppRadioCard — opção em formato de card (carteira, provedor, rede). Selecionado: borda de destaque.
 * É um `role="radio"`; o nome acessível vem do título + descrição.
 */
export const AppRadioCard = forwardRef<ComponentRef<typeof RadioGroup.Item>, AppRadioCardProps>(
  ({ className, title, description, icon, trailing, ...props }, ref) => (
    <RadioGroup.Item
      ref={ref}
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:border-subtle-foreground data-[state=checked]:border-foreground disabled:cursor-not-allowed disabled:opacity-50 md:rounded-sm",
        className,
      )}
      {...props}
    >
      <RadioDot />
      {icon && <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-background text-accent-foreground">{icon}</span>}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {description && <span className="truncate text-xs text-muted-foreground">{description}</span>}
      </span>
      {trailing}
    </RadioGroup.Item>
  ),
);
AppRadioCard.displayName = "AppRadioCard";

/**
 * AppRadioChip — opção em formato de "pílula" (edições 1/1, 1/10, 1/50, ABERTA).
 * Para opção indisponível, `disabled` + texto "Esgotada" dentro de `children` (não depender só da cor).
 */
export const AppRadioChip = forwardRef<ComponentRef<typeof RadioGroup.Item>, ComponentPropsWithoutRef<typeof RadioGroup.Item>>(
  ({ className, children, ...props }, ref) => (
    <RadioGroup.Item
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-subtle-foreground data-[state=checked]:border-primary data-[state=checked]:font-semibold data-[state=checked]:text-accent-foreground disabled:cursor-not-allowed disabled:line-through disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {children}
    </RadioGroup.Item>
  ),
);
AppRadioChip.displayName = "AppRadioChip";
