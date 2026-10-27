import type { ReactNode } from "react";
import { Dialog } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRestoreFocus } from "./useRestoreFocus";

const drawerVariants = cva(
  "fixed z-50 flex flex-col overflow-y-auto bg-card text-card-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
  {
    variants: {
      side: {
        left: "inset-y-0 left-0 w-[85%] max-w-sm border-r border-border data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
        right:
          "inset-y-0 right-0 w-[85%] max-w-sm border-l border-border data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
        bottom:
          "inset-x-0 bottom-0 max-h-[90dvh] rounded-t-2xl border-t border-border data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
      },
    },
    defaultVariants: { side: "bottom" },
  },
);

export interface AppDrawerProps extends VariantProps<typeof drawerVariants> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Rodapé fixo (ex.: botão "Aplicar filtros"). */
  footer?: ReactNode;
  className?: string;
}

/**
 * AppDrawer — painel deslizante (Radix Dialog): filtros no mobile, menu do perfil.
 * Mesmas garantias do AppModal (foco preso, Esc, foco devolvido). `side` padrão: bottom.
 */
export function AppDrawer({ open, onOpenChange, title, description, children, footer, side, className }: AppDrawerProps) {
  const focus = useRestoreFocus();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(drawerVariants({ side }), className)}
          onOpenAutoFocus={focus.onOpenAutoFocus}
          onCloseAutoFocus={focus.onCloseAutoFocus}
        >
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
            <Dialog.Title className="text-base font-semibold text-foreground">{title}</Dialog.Title>
            <Dialog.Close
              aria-label="Fechar"
              className="inline-flex size-8 items-center justify-center rounded-sm text-accent-foreground transition-colors hover:bg-background"
            >
              <X className="size-5" aria-hidden="true" />
            </Dialog.Close>
          </div>
          {description ? (
            <Dialog.Description className="px-5 pt-3 text-sm text-muted-foreground">{description}</Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{typeof title === "string" ? title : "Painel"}</Dialog.Description>
          )}
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="border-t border-border px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
