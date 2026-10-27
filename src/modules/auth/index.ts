/*
  API pública do módulo de autenticação (outros agentes dependem dela):

    useAuth(): AuthApi                               // Header/BottomNav (B), telas
    authStore.getSnapshot() / ensureReady()          // guard das rotas privadas, módulos
    authStore.subscribe((snapshot, { previous, reason }) => …)
        // D: mescla o carrinho ao autenticar, limpa draft e desconecta o socket ao sair/trocar de usuário
    safeRedirect(value)                              // valida `redirect` (somente caminhos internos)
*/
export { authStore } from "./authStore";
export type { AuthSnapshot, AuthChange, AuthChangeReason } from "./authStore";
export { useAuth } from "./useAuth";
export type { AuthApi } from "./useAuth";
export { safeRedirect } from "./redirect";
// AuthDialog NÃO é exportado aqui (o Header importa este índice): as rotas importam direto de components/ para code splitting.
