import type { NetworkId } from "@/contracts";
import { env } from "@/env";

export const API_BASE = env.VITE_API_URL;

export const DB_STORAGE_KEY = "kurio.mockdb.v1";
export const DB_SCHEMA_VERSION = 1;
export const DB_RNG_SEED = 20_260_626;

export const ACCESS_TTL_MS = 15 * 60_000;
export const REFRESH_TTL_MS = 7 * 24 * 60 * 60_000;
export const SHORT_ACCESS_TTL_MS = 60_000;
export const QUOTE_TTL_MS = 5 * 60_000;
export const ORDER_SETTLE_DELAY_MS = 1_500;
/** Ping do engine.io: o cliente fecha se ficar > pingInterval+pingTimeout (30 s) sem ping. */
export const SOCKET_PING_INTERVAL_MS = 20_000;

export const NETWORK_FEES: Record<NetworkId, string> = {
  ethereum: "0.016",
  polygon: "0.002",
  solana: "0.0005",
};

export const VALID_REFERRAL_CODES = ["KURIO-2026", "KURIO-VIP"] as const;

export const PAGE_SIZE_DEFAULT = 9;
