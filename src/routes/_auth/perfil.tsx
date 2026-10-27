import { createFileRoute } from "@tanstack/react-router";
import { AccountLayout } from "@/modules/profile/components/AccountLayout";

// Moldura de "Meu perfil" (sidebar no desktop, faixa rolável no mobile). Dono: Agente E.
export const Route = createFileRoute("/_auth/perfil")({
  component: AccountLayout,
});
