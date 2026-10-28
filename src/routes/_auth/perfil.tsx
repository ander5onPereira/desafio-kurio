import { createFileRoute } from "@tanstack/react-router";
import { AccountLayout } from "@/modules/profile/components/AccountLayout";

export const Route = createFileRoute("/_auth/perfil")({
  component: AccountLayout,
});
