import { QueryClient } from "@tanstack/react-query";
import { isApiError } from "./errors";

/**
 * Política de cache/retry (documentada em docs/CACHE.md). Padrões globais; cada hook ajusta
 * `staleTime` quando o recurso pede algo diferente (carrinho/cotação = 0, pedido = polling).
 *
 *  - staleTime 30 s · gcTime 5 min
 *  - queries: até 2 retentativas, só para falha transitória (rede, timeout, 5xx, 429), com
 *    backoff exponencial (sem jitter aleatório: mantém os testes determinísticos)
 *  - mutations: NUNCA reexecutam sozinhas (pedido reenvia manualmente com a MESMA Idempotency-Key)
 */
export const QUERY_STALE_MS = 30_000;
export const QUERY_GC_MS = 5 * 60_000;

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  return isApiError(error) ? error.retryable : false;
}

export const retryDelay = (attempt: number) => Math.min(500 * 2 ** attempt, 4_000);

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_MS,
        gcTime: QUERY_GC_MS,
        retry: shouldRetryQuery,
        retryDelay,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: { retry: 0 },
    },
  });
}

export const queryClient = createQueryClient();
