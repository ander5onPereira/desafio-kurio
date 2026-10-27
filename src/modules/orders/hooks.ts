import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isTerminalOrderStatus, type CreateOrderBody, type Order } from "@/contracts";
import type { ApiError } from "@/lib/errors";
import { keys, scopeOf } from "@/lib/queryKeys";
import { useAuth } from "@/modules/auth";
import { createOrder, fetchOrder, fetchOrders } from "./api";
import { mergeOrderIntoCache, pickNewestOrder } from "./cache";

/** Intervalo do polling enquanto o pedido está pendente: 2 s, crescendo 1,5× até 10 s. */
export const orderPollInterval = (updateCount: number) => Math.min(Math.round(2000 * 1.5 ** updateCount), 10_000);

/**
 * Estado do pedido. Enquanto `pending`, faz polling com backoff (fallback do evento `order.updated`
 * e da reconexão); para sozinho ao ficar terminal. O resultado REST nunca regride o que o evento
 * já gravou (pickNewestOrder).
 */
export function useOrder(orderId: string) {
  const { user, status } = useAuth();
  const scope = scopeOf(user?.id);
  const queryClient = useQueryClient();
  return useQuery<Order, ApiError>({
    queryKey: keys.order(scope, orderId),
    enabled: status === "authenticated",
    staleTime: 0,
    queryFn: async ({ signal }) => {
      const fresh = await fetchOrder(orderId, signal);
      return pickNewestOrder(queryClient.getQueryData<Order>(keys.order(scope, orderId)), fresh);
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && isTerminalOrderStatus(data.status)) return false;
      return orderPollInterval(query.state.dataUpdateCount);
    },
  });
}

/** Pedidos pendentes do usuário (recuperar após refresh/reconexão sem criar outra compra). */
export function usePendingOrders() {
  const { user, status } = useAuth();
  const scope = scopeOf(user?.id);
  return useQuery({
    queryKey: keys.pendingOrders(scope),
    enabled: status === "authenticated",
    staleTime: 0,
    queryFn: async ({ signal }) => (await fetchOrders("pending", signal)).items,
  });
}

export interface CreateOrderVariables {
  body: CreateOrderBody;
  idempotencyKey: string;
}

/** Cria o pedido (mutation SEM retry automático; o reenvio é decisão do checkout, com a MESMA chave). */
export function useCreateOrder() {
  const { user } = useAuth();
  const scope = scopeOf(user?.id);
  const queryClient = useQueryClient();
  return useMutation<Awaited<ReturnType<typeof createOrder>>, ApiError, CreateOrderVariables>({
    mutationFn: ({ body, idempotencyKey }) => createOrder(body, idempotencyKey),
    onSuccess: ({ order }) => {
      mergeOrderIntoCache(queryClient, scope, order);
    },
  });
}
