import { createFileRoute } from "@tanstack/react-router";
import { CartPage } from "@/modules/cart/components/CartPage";

export const Route = createFileRoute("/carrinho")({
  head: () => ({ meta: [{ title: "Carrinho de NFTs · Kurio" }] }),
  component: CartPage,
});
