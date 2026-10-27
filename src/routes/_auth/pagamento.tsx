import { createFileRoute } from "@tanstack/react-router";
import { PaymentPage } from "@/modules/checkout/components/PaymentPage";

/** Pagamento — privado (o guard `_auth` redireciona para /login?redirect=/pagamento). */
export const Route = createFileRoute("/_auth/pagamento")({
  head: () => ({ meta: [{ title: "Pagamento · Kurio" }] }),
  component: PaymentPage,
});
