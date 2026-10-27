import { createFileRoute, redirect } from "@tanstack/react-router";
import { authStore, safeRedirect } from "@/modules/auth";
import { AuthDialog } from "@/modules/auth/components/AuthDialog";
import { HomePage } from "@/modules/nfts/components/HomePage";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === "string" ? { redirect: search.redirect } : {},
  // Já autenticado? Segue direto para o destino (sem reabrir o formulário).
  beforeLoad: async ({ search }) => {
    const snapshot = await authStore.ensureReady();
    if (snapshot.isAuthenticated) throw redirect({ href: safeRedirect(search.redirect) });
  },
  head: () => ({ meta: [{ title: "Entrar · Kurio" }] }),
  component: LoginPage,
});

/** Desktop: diálogo sobre a página Início (como no Figma). Mobile: o diálogo vira tela cheia. */
function LoginPage() {
  const { redirect: redirectTo } = Route.useSearch();
  return (
    <>
      <HomePage search={{}} onSearchChange={() => undefined} />
      <AuthDialog mode="login" redirect={redirectTo} />
    </>
  );
}
