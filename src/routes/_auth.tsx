import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { authStore } from "@/modules/auth";

/**
 * Guard das rotas privadas (pagamento, pedidos, perfil). Aguarda a restauração da sessão
 * (refresh da página) e, se anônimo, leva ao login guardando para onde voltar (`redirect`).
 * Sessões que expiram DEPOIS da entrada na rota são tratadas pelo Axios + authStore (toast + login).
 */
export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ location }) => {
    const snapshot = await authStore.ensureReady();
    if (!snapshot.isAuthenticated) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: Outlet,
});
