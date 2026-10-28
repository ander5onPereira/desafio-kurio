import { WifiOff } from "lucide-react";
import { useOnline } from "@/hooks/useOnline";

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-warning-surface px-4 py-2 text-center text-sm text-warning">
      <WifiOff className="size-4 shrink-0" aria-hidden="true" />
      <span>Você está offline. Algumas ações ficam indisponíveis até a conexão voltar.</span>
    </div>
  );
}
