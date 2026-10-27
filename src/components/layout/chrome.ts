/**
 * Regras de quais peças do "chrome" aparecem em cada rota (Header só no desktop; no mobile cada
 * página tem a própria barra superior — ver MobileTopBar/MobileSearchBar).
 *  - BottomNav (mobile): só nas abas principais (início e conta);
 *  - Footer (desktop): fora da área da conta, do pedido e das telas de login/cadastro.
 */
const PRIVATE_AREA = /^\/(perfil|pedidos)(\/|$)/;
const AUTH_PAGES = /^\/(login|cadastro)\/?$/;
const MERCADO_ROUTES = /^\/(nft|carrinho|pagamento)(\/|$)/;

export function getChrome(pathname: string) {
  return {
    footer: !PRIVATE_AREA.test(pathname) && !AUTH_PAGES.test(pathname),
    bottomNav: pathname === "/" || /^\/perfil(\/|$)/.test(pathname),
  };
}

/**
 * Figma: "Mercado" fica ativo SÓ em detalhe, carrinho e pagamento. Em "/" (com ou sem #catalogo)
 * só "Início" fica ativo. Nas demais rotas (perfil, login…) nenhum dos dois é marcado como página atual.
 */
export const isMercadoActive = (pathname: string): boolean => MERCADO_ROUTES.test(pathname);
export const isInicioActive = (pathname: string): boolean => pathname === "/";

/** Rotas que exigem login: ao sair delas, voltamos ao início. */
export const isPrivatePath = (pathname: string) => /^\/(perfil|pagamento|pedidos)(\/|$)/.test(pathname);
