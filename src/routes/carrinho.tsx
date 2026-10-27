import { createFileRoute } from "@tanstack/react-router";
import { CartPage } from "@/modules/cart/components/CartPage";

/** Carrinho de NFTs — público (visitante tem carrinho próprio; checkout exige login). */
export const Route = createFileRoute("/carrinho")({
  head: () => ({ meta: [{ title: "Carrinho de NFTs · Kurio" }] }),
  component: CartPage,
});
