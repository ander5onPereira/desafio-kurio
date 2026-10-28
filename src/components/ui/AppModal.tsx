import type { ReactNode, RefObject } from "react";
import { Dialog } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRestoreFocus } from "./useRestoreFocus";

const contentVariants = cva(
  "fixed z-50 flex max-h-dvh flex-col overflow-y-auto bg-card text-card-foreground outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 md:data-[state=closed]:zoom-out-95 md:data-[state=open]:zoom-in-95",
  {
    variants: {
      size: {
        sm: "md:max-w-md",
        md: "md:max-w-xl",
        lg: "md:max-w-3xl",
      },
      fullScreenOnMobile: {
        true: "inset-0 rounded-none md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[calc(100dvh-4rem)] md:w-[calc(100%-2rem)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-md",
        false:
          "left-1/2 top-1/2 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-md",
      },
    },
    defaultVariants: { size: "md", fullScreenOnMobile: false },
  },
);

export interface AppModalProps extends VariantProps<typeof contentVariants> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Título (obrigatório para acessibilidade). Use `hideTitle` para ocultar visualmente. */
  title: ReactNode;
  hideTitle?: boolean;
  description?: ReactNode;
  children: ReactNode;
  /** Esconde o botão de fechar (use só se houver outra forma explícita de sair). */
  hideClose?: boolean;
  accentBar?: boolean;
  className?: string;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * AppModal — diálogo (Radix Dialog): foco preso, Esc fecha, foco devolvido ao gatilho, overlay.
 * No mobile pode virar tela cheia (`fullScreenOnMobile`). Faixa inferior laranja como no Figma.
 */
export function AppModal({
  open,
  onOpenChange,
  title,
  hideTitle,
  description,
  children,
  hideClose,
  accentBar = true,
  size,
  fullScreenOnMobile,
  className,
  onEscapeKeyDown,
  initialFocusRef,
}: AppModalProps) {
  const focus = useRestoreFocus(initialFocusRef);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(contentVariants({ size, fullScreenOnMobile }), accentBar && "border-b-8 border-primary", className)}
          onEscapeKeyDown={onEscapeKeyDown}
          onOpenAutoFocus={focus.onOpenAutoFocus}
          onCloseAutoFocus={focus.onCloseAutoFocus}
        >
          <div className="flex items-start justify-between gap-4 px-6 pt-6">
            <Dialog.Title className={cn("text-lg font-semibold text-foreground", hideTitle && "sr-only")}>{title}</Dialog.Title>
            {!hideClose && (
              <Dialog.Close
                aria-label="Fechar"
                className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-sm text-accent-foreground transition-colors hover:bg-background"
              >
                <X className="size-5" aria-hidden="true" />
              </Dialog.Close>
            )}
          </div>
          {description ? (
            <Dialog.Description className="px-6 pt-2 text-sm text-muted-foreground">{description}</Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{typeof title === "string" ? title : "Diálogo"}</Dialog.Description>
          )}
          <div className="flex-1 px-6 pb-6 pt-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
