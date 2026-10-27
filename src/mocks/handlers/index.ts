import { http, HttpResponse, type HttpHandler, type WebSocketHandler } from "msw";
import { API_BASE } from "../config";
import { socketHandler } from "../realtime/handler";
import { authHandlers } from "./auth";
import { cartHandlers } from "./cart";
import { favoriteHandlers } from "./favorites";
import { nftHandlers } from "./nfts";
import { orderHandlers } from "./orders";
import { profileHandlers } from "./profile";
import { quoteHandlers } from "./quotes";
import { walletHandlers } from "./wallets";

/**
 * Reúne todos os handlers REST (um arquivo por domínio, derivados de src/contracts/endpoints.ts)
 * e o do websocket. `buildRestHandlers(base)` existe para os testes (Node exige URL absoluta).
 */
export function buildRestHandlers(apiBase: string): HttpHandler[] {
  return [
    ...authHandlers(apiBase),
    ...nftHandlers(apiBase),
    ...favoriteHandlers(apiBase),
    ...cartHandlers(apiBase),
    ...quoteHandlers(apiBase),
    ...walletHandlers(apiBase),
    ...orderHandlers(apiBase),
    ...profileHandlers(apiBase),
    // Rota de API desconhecida: erro visível (404 no formato padrão), nunca silêncio.
    http.all(`${apiBase}/*`, () =>
      HttpResponse.json({ code: "NOT_FOUND", message: "Rota de API inexistente." }, { status: 404 }),
    ),
  ];
}

export const handlers: Array<HttpHandler | WebSocketHandler> = [...buildRestHandlers(API_BASE), socketHandler];
