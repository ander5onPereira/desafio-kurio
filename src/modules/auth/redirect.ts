/**
 * Valida o parâmetro `redirect` (retorno ao fluxo anterior).
 * Só aceita caminhos INTERNOS: começam com "/", nunca "//" (URL relativa a protocolo),
 * nunca "/\" e sem caracteres de controle. Evita open redirect.
 * Também evita laço: não volta para /login nem /cadastro.
 */
export function safeRedirect(value: unknown, fallback = "/"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  const path = value.split(/[?#]/)[0] ?? "";
  if (path === "/login" || path === "/cadastro") return fallback;
  return value;
}

const PRIVATE_PATH = /^\/(perfil|pagamento|pedidos)(\/|$)/;

/**
 * Para onde ir ao FECHAR o diálogo de login sem entrar: o `redirect` se ele for público;
 * se for uma rota privada, o início (voltar para ela mandaria o usuário de volta ao login).
 */
export function closeTarget(redirect: unknown): string {
  const target = safeRedirect(redirect);
  const path = target.split(/[?#]/)[0] ?? "";
  return PRIVATE_PATH.test(path) ? "/" : target;
}
