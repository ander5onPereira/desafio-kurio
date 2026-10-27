import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { Tabs } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * AppTabs — abas com linha inferior (Detalhes do NFT / Avaliações; Todos os NFTs / Novos lançamentos / Em alta).
 * Teclado: setas movem entre abas (Radix). A aba ativa usa a cor de destaque + sublinhado (não só cor).
 */
export const AppTabs = Tabs.Root;

export const AppTabsList = forwardRef<ComponentRef<typeof Tabs.List>, ComponentPropsWithoutRef<typeof Tabs.List>>(
  ({ className, ...props }, ref) => (
    <Tabs.List ref={ref} className={cn("flex items-center gap-6 overflow-x-auto border-b border-border", className)} {...props} />
  ),
);
AppTabsList.displayName = "AppTabsList";

export const AppTabsTrigger = forwardRef<ComponentRef<typeof Tabs.Trigger>, ComponentPropsWithoutRef<typeof Tabs.Trigger>>(
  ({ className, ...props }, ref) => (
    <Tabs.Trigger
      ref={ref}
      className={cn(
        "-mb-px shrink-0 whitespace-nowrap border-b-2 border-transparent py-3 text-sm text-foreground transition-colors hover:text-accent-foreground data-[state=active]:border-primary data-[state=active]:font-semibold data-[state=active]:text-accent-foreground",
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
