import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { Tabs } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * AppTabs — abas com linha inferior (Detalhes do NFT / Avaliações; Todos os NFTs / Novos lançamentos / Em alta).
 * Teclado: setas movem entre abas (Radix). A aba ativa usa a cor de destaque + sublinhado (não só cor).
 *
 * A lista rola só na horizontal (mobile, quando as abas não cabem). A linha-base é uma sombra interna, não
 * `border-b`: assim fica DENTRO da área rolável e o sublinhado da aba ativa a cobre sem vazar do contêiner.
 * O vazamento (`-mb-px` + `border-b`) criava 1 px de rolagem vertical — a barra com setas ▲▼ no Windows — e
 * cortava metade do sublinhado. Para uma lista sem linha-base use `shadow-none`.
 */
export const AppTabs = Tabs.Root;

export const AppTabsList = forwardRef<ComponentRef<typeof Tabs.List>, ComponentPropsWithoutRef<typeof Tabs.List>>(
  ({ className, ...props }, ref) => (
    <Tabs.List
      ref={ref}
      // `overflow-y-hidden`: só com `overflow-x-auto` o eixo Y vira `auto` e qualquer subpixel mostra a barra vertical.
      className={cn("flex items-center gap-6 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_0_var(--color-border)]", className)}
      {...props}
    />
  ),
);
AppTabsList.displayName = "AppTabsList";

export const AppTabsTrigger = forwardRef<ComponentRef<typeof Tabs.Trigger>, ComponentPropsWithoutRef<typeof Tabs.Trigger>>(
  ({ className, ...props }, ref) => (
    <Tabs.Trigger
      ref={ref}
      className={cn(
        "shrink-0 whitespace-nowrap border-b-2 border-transparent py-3 text-sm text-foreground transition-colors hover:text-accent-foreground data-[state=active]:border-primary data-[state=active]:font-semibold data-[state=active]:text-accent-foreground",
        className,
      )}
      {...props}
    />
  ),
);
AppTabsTrigger.displayName = "AppTabsTrigger";

export const AppTabsContent = forwardRef<ComponentRef<typeof Tabs.Content>, ComponentPropsWithoutRef<typeof Tabs.Content>>(
  ({ className, ...props }, ref) => <Tabs.Content ref={ref} className={cn("pt-4 outline-offset-4", className)} {...props} />,
);
AppTabsContent.displayName = "AppTabsContent";
