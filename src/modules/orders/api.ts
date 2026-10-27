import { callEndpoint, callEndpointRaw } from "@/lib/api";
import { endpoints, IDEMPOTENCY_HEADER, IDEMPOTENT_REPLAY_HEADER, type CreateOrderBody, type OrderStatus } from "@/contracts";

/**
 * POST /orders com `Idempotency-Key`. Devolve também se a resposta foi um REPLAY
 * (header `Idempotent-Replayed: true`): o servidor reconheceu a mesma tentativa e devolveu o mesmo pedido.
 */
export async function createOrder(body: CreateOrderBody, idempotencyKey: string) {
  const { data, status, headers } = await callEndpointRaw(endpoints.orders.create, {
    body,
    headers: { [IDEMPOTENCY_HEADER]: idempotencyKey },
  });
  return { order: data, status, replayed: headers[IDEMPOTENT_REPLAY_HEADER.toLowerCase()] === "true" };
}

export const fetchOrder = (orderId: string, signal?: AbortSignal) =>
  callEndpoint(endpoints.orders.get, { params: { orderId }, signal });

export const fetchOrders = (status?: OrderStatus, signal?: AbortSignal) =>
  callEndpoint(endpoints.orders.list, { query: { status }, signal });
