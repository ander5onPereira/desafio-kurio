import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/modules/profile/components/ProfilePage";

export const Route = createFileRoute("/_auth/perfil/")({
  head: () => ({ meta: [{ title: "Perfil do colecionador · Kurio" }] }),
  component: ProfilePage,
});
