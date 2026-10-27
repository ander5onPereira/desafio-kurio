import { createFileRoute } from "@tanstack/react-router";
import { WalletsPage } from "@/modules/wallets/components/WalletsPage";

export const Route = createFileRoute("/_auth/perfil/carteiras")({
  head: () => ({ meta: [{ title: "Carteiras · Kurio" }] }),
  component: WalletsPage,
});
