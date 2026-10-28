import type { EthString, Order, ScenarioId, Wallet, NetworkId } from "@/contracts";

/** Registros do banco do servidor simulado. Tudo é JSON puro (persistível em localStorage). */

export interface DbUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  passwordHash: string;
  salt: string;
  avatarUrl: string | null;
  ensName: string | null;
  walletNickname: string | null;
  createdAt: string;
}

export interface DbSession {
  accessToken: string;
  refreshToken: string;
  userId: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
  createdAt: number;
}

export interface DbEditionState {
  id: string;
  price: EthString;
  compareAtPrice: EthString | null;
  available: number;
}

export interface DbNftState {
  /** Versão monotônica do NFT (sobe a cada mudança de preço/estoque). */
  version: number;
  editions: DbEditionState[];
}

export interface DbCartItem {
  nftId: string;
  editionId: string;
  quantity: number;
  /** Preço quando o usuário viu/alterou o item pela última vez (base do aviso "preço mudou"). */
  priceAtAdd: EthString;
}

export interface DbCart {
  /** userId do dono; para visitante, o id vem do header X-Cart-Id. */
  id: string;
  ownerUserId: string | null;
  items: DbCartItem[];
  version: number;
  updatedAt: string;
}

export interface DbWallet extends Wallet {
  userId: string;
}

export interface DbQuote {
  id: string;
  ownerKey: string;
  revision: string;
  couponCode: string | null;
  network: NetworkId;
  expiresAt: number;
}

export type OrderOutcome = "confirmed" | "declined";

export interface DbOrderItem {
  nftId: string;
  editionId: string;
  quantity: number;
}

export interface DbOrder {
  order: Order;
  userId: string;
  idempotencyKey: string;
  /** Hash do corpo (detecta reutilização da chave com conteúdo diferente). */
  requestHash: string;
  /** Resultado decidido NA CRIAÇÃO (mudar o cenário depois não altera). */
  outcome: OrderOutcome;
  settleAt: number;
  items: DbOrderItem[];
}

export interface DbMeta {
  scenario: ScenarioId;
  rngState: number;
  counters: Record<string, number>;
}

export interface DbState {
  schemaVersion: number;
  meta: DbMeta;
  users: Record<string, DbUser>;
  sessions: Record<string, DbSession>;
  nftState: Record<string, DbNftState>;
  favorites: Record<string, string[]>;
  carts: Record<string, DbCart>;
  wallets: Record<string, DbWallet>;
  quotes: Record<string, DbQuote>;
  orders: Record<string, DbOrder>;
  /** `${userId}:${Idempotency-Key}` → orderId. */
  idempotency: Record<string, string>;
}
