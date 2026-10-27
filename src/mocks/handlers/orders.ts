import { endpoints, IDEMPOTENCY_HEADER, IDEMPOTENT_REPLAY_HEADER } from "@/contracts";
import { createOrder, getOrder, listOrders } from "../services/orders";
import { ok, route } from "./route";

/**
 * Pedidos. 202 = criado e pendente; 200 + `Idempotent-Replayed: true` = a mesma chave devolveu o
 * pedido já existente. O estado final chega por `order.updated` (Socket.IO) ou por GET.
 */
export const orderHandlers = (base: string) => [
  route(base, endpoints.orders.create, ({ request, requireUser, body, holdResponse }) => {
    const result = createOrder(requireUser(), body, request.headers.get(IDEMPOTENCY_HEADER));
    if (result.hold) holdResponse();
    return result.replayed
      ? ok(result.order, { [IDEMPOTENT_REPLAY_HEADER]: "true" })
      : { status: 202, body: result.order };
  }),
  route(base, endpoints.orders.get, ({ requireUser, params }) => ok(getOrder(requireUser(), params.orderId))),
  route(base, endpoints.orders.list, ({ requireUser, query }) =>
    ok({ items: listOrders(requireUser(), query.status) }),
  ),
];
