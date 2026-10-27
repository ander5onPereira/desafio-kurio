import { z } from "zod";

/**
 * Tipos e schemas básicos compartilhados entre o app, os mocks e os testes.
 * Regra de ouro: valores em ETH SEMPRE trafegam como string decimal (nunca number).
 */

/** Valor em ETH como string decimal (até 18 casas), ex.: "1.19", "26.846". */
export const ethString = z.string().regex(/^\d+(\.\d{1,18})?$/, "Valor em ETH inválido");
export type EthString = z.infer<typeof ethString>;

export const idSchema = z.string().min(1);
export const isoDate = z.iso.datetime();

/** Redes suportadas (filtro "Rede" do catálogo e seleção no pagamento). */
export const NETWORK_IDS = ["ethereum", "polygon", "solana"] as const;
export const networkId = z.enum(NETWORK_IDS);
export type NetworkId = z.infer<typeof networkId>;
export const NETWORK_LABELS: Record<NetworkId, string> = {
  ethereum: "Ethereum",
  polygon: "Polygon",
  solana: "Solana",
};

/** Provedores de carteira simulados (nenhuma extensão real é usada). */
export const WALLET_PROVIDERS = ["metamask", "walletconnect", "coinbase"] as const;
export const walletProvider = z.enum(WALLET_PROVIDERS);
export type WalletProvider = z.infer<typeof walletProvider>;
export const WALLET_PROVIDER_LABELS: Record<WalletProvider, string> = {
  metamask: "MetaMask",
  walletconnect: "WalletConnect",
  coinbase: "Coinbase Wallet",
};

/**
 * As artes ficam no front (public/img). A API só diz QUAL arte usar e o texto alternativo.
 * Chaves: golden = NFT-Artwork-01, emerald = 02, sage = 03, ivory = 04.
 */
export const ARTWORK_KEYS = ["golden", "emerald", "sage", "ivory"] as const;
export const artworkKey = z.enum(ARTWORK_KEYS);
export type ArtworkKey = z.infer<typeof artworkKey>;
export const artworkSchema = z.object({ key: artworkKey, alt: z.string().min(1) });
export type Artwork = z.infer<typeof artworkSchema>;

export const paginationSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});
export type Pagination = z.infer<typeof paginationSchema>;

/** Status de linha usado no carrinho e na cotação. */
export const lineStatus = z.enum(["ok", "price-changed", "limited", "unavailable"]);
export type LineStatus = z.infer<typeof lineStatus>;

/** Resposta sem corpo (204). */
export const noContent = z.unknown();
