import type { ReactNode } from "react";
import { AppButton } from "./AppButton";
import { AppModal } from "./AppModal";

export interface AppConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isLoading?: boolean;
  /** Ação destrutiva (remover, sair): botão de confirmação em vermelho. */
  destructive?: boolean;
  /** Conteúdo extra entre a descrição e os botões (ex.: lista do que mudou). */
  children?: ReactNode;
}

/**
 * AppConfirm — confirmação explícita (remover item, "o preço mudou, confirme novamente").
 * Foco inicial cai no botão de cancelar (ação segura) por ser o primeiro focável.
 */
export function AppConfirm({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  isLoading,
  destructive,
  children,
}: AppConfirmProps) {
  return (
    <AppModal open={open} onOpenChange={onOpenChange} title={title} description={description} size="sm">
      {children}
      <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <AppButton variant="secondary" onClick={() => onOpenChange(false)} disabled={isLoading}>
          {cancelLabel}
        </AppButton>
        <AppButton variant={destructive ? "danger" : "primary"} onClick={onConfirm} isLoading={isLoading}>
          {confirmLabel}
        </AppButton>
      </div>
    </AppModal>
  );
}
