/**
 * Props de <Link> para o login preservando o retorno (`?redirect=`). Não inclui o `redirect`
 * quando já estamos em /login ou /cadastro (evita laço).
 * Uso: <Link {...loginLinkProps(location.href)}>Entrar</Link>
 */
export function loginLinkProps(currentHref: string) {
  const onAuthPage = /^\/(login|cadastro)(\/|\?|$)/.test(currentHref);
  return { to: "/login", search: onAuthPage ? {} : { redirect: currentHref } } as const;
}
