import type { QueryClient } from "@tanstack/react-query";
import { isTerminalOrderStatus, type Order } from "@/contracts";
import { keys, type Scope } from "@/lib/queryKeys";

/**
 * Escreve o pedido no cache SÓ se for mais novo (versão maior) que o já conhecido, e nunca tira um
 * pedido de um estado terminal (confirmed/declined). Assim uma resposta REST atrasada ou um evento
 * antigo/duplicado não regridem a tela. Devolve o que ficou no cache.
 */
export function mergeOrderIntoCache(queryClient: QueryClient, scope: Scope, incoming: Order): Order {
  const key = keys.order(scope, incoming.id);
  const current = queryClient.getQueryData<Order>(key);
  const winner = pickNewestOrder(current, incoming);
  if (winner !== current) queryClient.setQueryData(key, winner);
  // A lista de pendentes deixa de ser confiável quando o estado muda.
  if (!current || current.status !== winner.status) {
    void queryClient.invalidateQueries({ queryKey: keys.pendingOrders(scope) });
  }
  return winner;
}

export function pickNewestOrder(current: Order | undefined, incoming: Order): Order {
  if (!current) return incoming;
  if (isTerminalOrderStatus(current.status) && !isTerminalOrderStatus(incoming.status)) return current;
  return incoming.version > current.version ? incoming : current;
}
