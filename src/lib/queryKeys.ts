import type { NftListQuery } from "@/contracts";

/**
 * Fábrica ÚNICA de query keys (todos os módulos usam esta — nada de array solto nos hooks).
 *
 * Isolamento por usuário: tudo que é privado leva o escopo (`userId` ou "guest") na chave,
 * então trocar de usuário nunca reaproveita cache do anterior. Além disso, logout/troca de
 * usuário faz `queryClient.clear()`.
 *
 * Públicos (catálogo) são compartilhados entre usuários. Para o realtime atualizar listas em
 * cache use o prefixo: queryClient.setQueriesData({ queryKey: keys.nfts.lists() }, ...).
 */
export type Scope = string; // userId | "guest"
export const GUEST_SCOPE: Scope = "guest";
export const scopeOf = (userId: string | null | undefined): Scope => userId ?? GUEST_SCOPE;

export const keys = {
  session: () => ["session"] as const,
  nfts: {
    all: () => ["nfts"] as const,
    lists: () => ["nfts", "list"] as const,
    list: (query: NftListQuery) => ["nfts", "list", query] as const,
    featured: () => ["nfts", "featured"] as const,
    details: () => ["nfts", "detail"] as const,
    detail: (nftId: string) => ["nfts", "detail", nftId] as const,
    related: (nftId: string) => ["nfts", "related", nftId] as const,
    reviews: (nftId: string) => ["nfts", "reviews", nftId] as const,
  },
  favorites: (scope: Scope) => ["u", scope, "favorites"] as const,
  cart: (scope: Scope) => ["u", scope, "cart"] as const,
  /** `signature` = cupom + rede + versão do carrinho (muda → nova cotação). */
  quote: (scope: Scope, signature: string) => ["u", scope, "quote", signature] as const,
  quotes: (scope: Scope) => ["u", scope, "quote"] as const,
  orders: (scope: Scope) => ["u", scope, "orders"] as const,
  order: (scope: Scope, orderId: string) => ["u", scope, "orders", orderId] as const,
  pendingOrders: (scope: Scope) => ["u", scope, "orders", "pending"] as const,
  profile: (scope: Scope) => ["u", scope, "profile"] as const,
  wallets: (scope: Scope) => ["u", scope, "wallets"] as const,
};
