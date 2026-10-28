import type { ReactNode } from "react";
import { TriangleAlert, WifiOff } from "lucide-react";
import { hasErrorCode } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { AppButton } from "./AppButton";

export interface AppErrorProps {
  error?: unknown;
  title?: string;
  message?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  isRetrying?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * AppError — estado de erro com recuperação. Usa `role="alert"` e ícone + texto (não só cor).
 * Falhas de conexão/timeout ganham ícone e mensagem próprios.
 */
export function AppError({ error, title, message, onRetry, retryLabel = "Tentar novamente", isRetrying, compact, className }: AppErrorProps) {
  const offline = hasErrorCode(error, "NETWORK_ERROR", "TIMEOUT");
  const defaultTitle = offline ? "Sem conexão com o servidor" : "Algo deu errado";
  const defaultMessage = error instanceof Error ? error.message : "Não foi possível carregar este conteúdo.";
  const Icon = offline ? WifiOff : TriangleAlert;

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-3 rounded-md border border-danger/40 bg-danger-surface text-center",
        compact ? "px-4 py-6" : "px-6 py-12",
        className,
      )}
    >
      <Icon className={cn("text-danger", compact ? "size-6" : "size-9")} aria-hidden="true" />
      <h2 className="text-base font-semibold text-foreground">{title ?? defaultTitle}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{message ?? defaultMessage}</p>
      {onRetry && (
        <AppButton variant="outline" size="sm" onClick={onRetry} isLoading={isRetrying} className="mt-1">
          {retryLabel}
        </AppButton>
      )}
    </div>
  );
}
