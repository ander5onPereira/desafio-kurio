import type { CSSProperties } from "react";
import { Toaster, toast } from "sonner";

/**
 * AppToaster — notificações (Sonner), topo-direita, com os tokens do Kurio.
 * Montado UMA vez no root. Para disparar: `import { toast } from "@/components/ui"`.
 * Toda mutation deve gerar feedback (salvou, falhou, removeu…). Mensagens curtas, em PT-BR.
 */
export function AppToaster() {
  const style = {
    "--normal-bg": "var(--card)",
    "--normal-text": "var(--foreground)",
    "--normal-border": "var(--border)",
    "--success-bg": "var(--success-surface)",
    "--success-text": "var(--success)",
    "--success-border": "var(--success)",
    "--error-bg": "var(--danger-surface)",
    "--error-text": "var(--danger)",
    "--error-border": "var(--danger)",
    "--info-bg": "var(--info-surface)",
    "--info-text": "var(--info)",
    "--info-border": "var(--info)",
    "--warning-bg": "var(--warning-surface)",
    "--warning-text": "var(--warning)",
    "--warning-border": "var(--warning)",
    fontFamily: "var(--font-sans)",
  } as CSSProperties;

  return <Toaster theme="dark" position="top-right" closeButton style={style} toastOptions={{ classNames: { toast: "!rounded-md" } }} />;
}

export { toast };
