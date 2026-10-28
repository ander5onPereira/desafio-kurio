import { createFileRoute } from "@tanstack/react-router";
import { PaymentPage } from "@/modules/checkout/components/PaymentPage";

export const Route = createFileRoute("/_auth/pagamento")({
  head: () => ({ meta: [{ title: "Pagamento · Kurio" }] }),
  component: PaymentPage,
});
