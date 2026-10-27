import { useAuth } from "@/modules/auth";
import { useConnectionStatus } from "@/modules/realtime";

/**
 * Indicador discreto do tempo real. Só aparece para quem está logado e quando a conexão NÃO está
 * saudável (reconectando/desconectado) — com texto, não só cor — e é anunciado como `status`.
 */
export function ConnectionIndicator() {
  const { isAuthenticated } = useAuth();
  const status = useConnectionStatus();
  if (!isAuthenticated || status === "connected") return null;

  const reconnecting = status === "reconnecting";
  return (
    <div
      role="status"
      className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground md:bottom-4"
    >
      <span aria-hidden="true" className={reconnecting ? "size-2 rounded-full bg-warning motion-safe:animate-pulse" : "size-2 rounded-full bg-danger"} />
      {reconnecting ? "Reconectando ao tempo real…" : "Tempo real desconectado"}
    </div>
  );
}
