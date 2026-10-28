import { createFileRoute } from "@tanstack/react-router";
import { OrderPage } from "@/modules/orders/components/OrderPage";

export const Route = createFileRoute("/_auth/pedidos/$orderId")({
  head: () => ({ meta: [{ title: "Pedido · Kurio" }] }),
  component: OrderRoute,
});

function OrderRoute() {
  const { orderId } = Route.useParams();
  return <OrderPage orderId={orderId} />;
}
