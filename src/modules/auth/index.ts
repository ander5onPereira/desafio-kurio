export { authStore } from "./authStore";
export type { AuthSnapshot, AuthChange, AuthChangeReason } from "./authStore";
export { useAuth } from "./useAuth";
export type { AuthApi } from "./useAuth";
export { safeRedirect } from "./redirect";
// AuthDialog NÃO é exportado aqui (o Header importa este índice): as rotas importam direto de components/ para code splitting.
