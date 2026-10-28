import { defineEndpoint } from "./endpoint";
import { noContent } from "./common";
import {
  loginBodySchema,
  refreshBodySchema,
  refreshResponseSchema,
  registerBodySchema,
  sessionSchema,
  userSchema,
} from "./auth";
import {
  featuredResponseSchema,
  nftDetailSchema,
  nftListQuerySchema,
  nftListResponseSchema,
  nftRelatedResponseSchema,
  nftReviewsResponseSchema,
} from "./nfts";
import { favoriteStateSchema, favoritesResponseSchema } from "./favorites";
import {
  addCartItemBodySchema,
  cartSchema,
  mergeCartBodySchema,
  mergeCartResponseSchema,
  updateCartItemBodySchema,
} from "./cart";
import { quoteRequestBodySchema, quoteSchema } from "./quote";
import {
  connectWalletBodySchema,
  connectWalletResponseSchema,
  walletInputSchema,
  walletSchema,
  walletsResponseSchema,
} from "./wallets";
import {
  createOrderBodySchema,
  orderSchema,
  ordersListQuerySchema,
  ordersListResponseSchema,
} from "./orders";
import {
  changePasswordBodySchema,
  profileSchema,
  updateAvatarBodySchema,
  updateProfileBodySchema,
} from "./profile";

/**
 * TODOS os endpoints REST do app. Base: env.VITE_API_URL (padrão "/api").
 * Para o cliente: `callEndpoint(endpoints.nfts.list, { query })`.
 * Para o MSW: `http[ep.method](API_BASE + ep.path, ...)`.
 *
 * Cabeçalhos especiais (não fazem parte do corpo):
 *  - `Authorization: Bearer <accessToken>` (todas as rotas privadas);
 *  - `X-Cart-Id: <uuid>` (carrinho/cotação do visitante);
 *  - `Idempotency-Key: <uuid>` em POST /orders (obrigatório).
 */
export const endpoints = {
  auth: {
    register: defineEndpoint({
      method: "post",
      path: "/auth/register",
      auth: "public",
      body: registerBodySchema,
      response: sessionSchema,
      description: "Cria conta e já inicia a sessão. 409 EMAIL_TAKEN / USERNAME_TAKEN; 422 VALIDATION_ERROR.",
    }),
    login: defineEndpoint({
      method: "post",
      path: "/auth/login",
      auth: "public",
      body: loginBodySchema,
      response: sessionSchema,
      description: "Autentica. 401 UNAUTHENTICATED com credenciais inválidas.",
    }),
    refresh: defineEndpoint({
      method: "post",
      path: "/auth/refresh",
      auth: "public",
      body: refreshBodySchema,
      response: refreshResponseSchema,
      description: "Troca o refreshToken por novos tokens (rotação). 401 SESSION_EXPIRED se inválido/expirado.",
    }),
    logout: defineEndpoint({
      method: "post",
      path: "/auth/logout",
      auth: "required",
      response: noContent,
      description: "Invalida a sessão (204).",
    }),
    me: defineEndpoint({
      method: "get",
      path: "/auth/me",
      auth: "required",
      response: userSchema,
      description: "Usuário da sessão atual (restaura a sessão após refresh). 401 SESSION_EXPIRED se o token venceu.",
    }),
  },
  nfts: {
    list: defineEndpoint({
      method: "get",
      path: "/nfts",
      auth: "public",
      query: nftListQuerySchema,
      response: nftListResponseSchema,
      description: "Catálogo com busca, filtros combináveis, ordenação, abas e paginação + facetas (contagens).",
    }),
    featured: defineEndpoint({
      method: "get",
      path: "/nfts/featured",
      auth: "public",
      response: featuredResponseSchema,
      description: "Slides do hero e NFT em destaque da home.",
    }),
    detail: defineEndpoint({
      method: "get",
      path: "/nfts/:nftId",
      auth: "public",
      response: nftDetailSchema,
      description: "Detalhe do NFT. 404 NOT_FOUND se não existir.",
    }),
    related: defineEndpoint({
      method: "get",
      path: "/nfts/:nftId/related",
      auth: "public",
      response: nftRelatedResponseSchema,
      description: "'Mais desta coleção' / 'Colecionadores também viram'.",
    }),
    reviews: defineEndpoint({
      method: "get",
      path: "/nfts/:nftId/reviews",
      auth: "public",
      response: nftReviewsResponseSchema,
      description: "Avaliações dos colecionadores (aba do detalhe).",
    }),
  },
  favorites: {
    list: defineEndpoint({
      method: "get",
      path: "/favorites",
      auth: "required",
      response: favoritesResponseSchema,
      description: "Favoritos do usuário (isolados por usuário).",
    }),
    add: defineEndpoint({
      method: "put",
      path: "/favorites/:nftId",
      auth: "required",
      response: favoriteStateSchema,
      description: "Favorita (idempotente). 404 se o NFT não existir.",
    }),
    remove: defineEndpoint({
      method: "delete",
      path: "/favorites/:nftId",
      auth: "required",
      response: favoriteStateSchema,
      description: "Remove o favorito (idempotente).",
    }),
  },
  cart: {
    get: defineEndpoint({
      method: "get",
      path: "/cart",
      auth: "optional",
      response: cartSchema,
      description: "Carrinho do usuário (token) ou do visitante (X-Cart-Id). Sempre existe (vazio se novo).",
    }),
    addItem: defineEndpoint({
      method: "post",
      path: "/cart/items",
      auth: "optional",
      body: addCartItemBodySchema,
      response: cartSchema,
      description: "Adiciona (ou soma quantidade). 409 AVAILABILITY_CONFLICT se exceder estoque/limite; 404 se NFT/edição não existir.",
    }),
    updateItem: defineEndpoint({
      method: "patch",
      path: "/cart/items/:itemId",
      auth: "optional",
      body: updateCartItemBodySchema,
      response: cartSchema,
      description: "Altera a quantidade (respeita estoque/limite: 409 AVAILABILITY_CONFLICT).",
    }),
    removeItem: defineEndpoint({
      method: "delete",
      path: "/cart/items/:itemId",
      auth: "optional",
      response: cartSchema,
      description: "Remove o item.",
    }),
    merge: defineEndpoint({
      method: "post",
      path: "/cart/merge",
      auth: "required",
      body: mergeCartBodySchema,
      response: mergeCartResponseSchema,
      description: "Mescla o carrinho do visitante no do usuário após autenticar.",
    }),
  },
  quotes: {
    create: defineEndpoint({
      method: "post",
      path: "/quotes",
      auth: "optional",
      body: quoteRequestBodySchema,
      response: quoteSchema,
      description: "Cotação do carrinho atual (+cupom, +rede): subtotal, desconto, taxa, total. 422 COUPON_INVALID / COUPON_EXPIRED.",
    }),
  },
  wallets: {
    list: defineEndpoint({
      method: "get",
      path: "/wallets",
      auth: "required",
      response: walletsResponseSchema,
      description: "Carteiras do usuário (principal e secundária).",
    }),
    create: defineEndpoint({
      method: "post",
      path: "/wallets",
      auth: "required",
      body: walletInputSchema,
      response: walletSchema,
      description: "Cadastra carteira. 409 CONFLICT se já existir uma com a mesma função/endereço; 422 com fieldErrors.",
    }),
    update: defineEndpoint({
      method: "put",
      path: "/wallets/:walletId",
      auth: "required",
      body: walletInputSchema,
      response: walletSchema,
      description: "Atualiza carteira. 404 se não for do usuário.",
    }),
    connect: defineEndpoint({
      method: "post",
      path: "/wallets/connect",
      auth: "required",
      body: connectWalletBodySchema,
      response: connectWalletResponseSchema,
      description: "Simula a conexão do provedor. 422 WALLET_REJECTED quando o usuário 'recusa'.",
    }),
    disconnect: defineEndpoint({
      method: "post",
      path: "/wallets/disconnect",
      auth: "required",
      response: noContent,
      description: "Simula a desconexão (204).",
    }),
  },
  orders: {
    create: defineEndpoint({
      method: "post",
      path: "/orders",
      auth: "required",
      body: createOrderBodySchema,
      response: orderSchema,
      description:
        "Cria o pedido (header Idempotency-Key obrigatório). 202 pending | 200 replay idempotente. Revalida preço/estoque/cupom/taxa: 409 QUOTE_CHANGED (meta.quote) | AVAILABILITY_CONFLICT (meta.items) | IDEMPOTENCY_KEY_REUSED.",
    }),
    get: defineEndpoint({
      method: "get",
      path: "/orders/:orderId",
      auth: "required",
      response: orderSchema,
      description: "Estado e recibo do pedido. 404 se não for do usuário.",
    }),
    list: defineEndpoint({
      method: "get",
      path: "/orders",
      auth: "required",
      query: ordersListQuerySchema,
      response: ordersListResponseSchema,
      description: "Pedidos do usuário (recuperar pendentes após refresh).",
    }),
  },
  profile: {
    get: defineEndpoint({
      method: "get",
      path: "/profile",
      auth: "required",
      response: profileSchema,
      description: "Perfil do colecionador.",
    }),
    update: defineEndpoint({
      method: "patch",
      path: "/profile",
      auth: "required",
      body: updateProfileBodySchema,
      response: profileSchema,
      description: "Atualiza dados. 409 EMAIL_TAKEN / USERNAME_TAKEN; 422 com fieldErrors.",
    }),
    setAvatar: defineEndpoint({
      method: "put",
      path: "/profile/avatar",
      auth: "required",
      body: updateAvatarBodySchema,
      response: profileSchema,
      description: "Define o avatar (data URL).",
    }),
    removeAvatar: defineEndpoint({
      method: "delete",
      path: "/profile/avatar",
      auth: "required",
      response: profileSchema,
      description: "Remove o avatar.",
    }),
    changePassword: defineEndpoint({
      method: "put",
      path: "/profile/password",
      auth: "required",
      body: changePasswordBodySchema,
      response: noContent,
      description: "Altera a senha (204). 422 fieldErrors.currentPassword se a atual estiver incorreta.",
    }),
  },
} as const;

export const allEndpoints = Object.values(endpoints).flatMap((group) => Object.values(group));
