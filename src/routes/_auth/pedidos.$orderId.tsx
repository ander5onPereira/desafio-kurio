import { createFileRoute } from "@tanstack/react-router";
import { OrderPage } from "@/modules/orders/components/OrderPage";

/** Confirmação de pedido — privada. Recibo só para pedido `confirmed`; pendente/recusado têm tela própria. */
export const Route = createFileRoute("/_auth/pedidos/$orderId")({
  head: () => ({ meta: [{ title: "Pedido · Kurio" }] }),
  component: OrderRoute,
});

function OrderRoute() {
  const { orderId } = Route.useParams();
  return <OrderPage orderId={orderId} />;
}
