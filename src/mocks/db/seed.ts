import type { ScenarioId } from "@/contracts";
import { DB_RNG_SEED, DB_SCHEMA_VERSION } from "../config";
import { CATALOG, FIGMA_IDS } from "../fixtures/catalog";
import { USER_FIXTURES } from "../fixtures/users";
import { clock } from "../lib/clock";
import { hashPassword } from "../lib/password";
import { notifyReset, persistNow, setDb } from "./store";
import type { DbCart, DbState, DbWallet } from "./types";

/**
 * Monta o estado inicial de um cenário. Determinístico: mesmas fixtures, mesma semente, mesmos ids.
 * (Datas "de criação" das fixtures são fixas; só carrinho/seed do `figma` usa o relógio do mock.)
 */
export async function buildSeed(scenario: ScenarioId): Promise<DbState> {
  const users: DbState["users"] = {};
  const favorites: DbState["favorites"] = {};
  const wallets: DbState["wallets"] = {};

  for (const fixture of USER_FIXTURES) {
    users[fixture.id] = {
      id: fixture.id,
      username: fixture.username,
      displayName: fixture.displayName,
      email: fixture.email,
      passwordHash: await hashPassword(fixture.password, fixture.salt),
      salt: fixture.salt,
      avatarUrl: null,
      ensName: fixture.ensName,
      walletNickname: fixture.walletNickname,
      createdAt: fixture.createdAt,
    };
    favorites[fixture.id] = [...fixture.favorites];
    for (const wallet of fixture.wallets) {
      const record: DbWallet = {
        ...wallet,
        secondaryRef: wallet.secondaryRef ?? null,
        userId: fixture.id,
        createdAt: fixture.createdAt,
        updatedAt: fixture.createdAt,
      };
      wallets[wallet.id] = record;
    }
  }

  const nftState: DbState["nftState"] = {};
  for (const nft of CATALOG) {
    nftState[nft.id] = {
      version: 1,
      editions: nft.editions.map((edition) => ({
        id: edition.id,
        price: edition.price,
        compareAtPrice: edition.compareAtPrice,
        available: edition.available,
      })),
    };
  }

  const carts: DbState["carts"] = {};
  if (scenario === "figma") {
    // Carrinho idêntico ao frame desktop: Emerald ×2, Violet ×6, Ivory ×9 → 26.83 / 0.016 / 26.846.
    const priceOf = (nftId: string, editionId: string) =>
      nftState[nftId]?.editions.find((edition) => edition.id === editionId)?.price ?? "0";
    const cart: DbCart = {
      id: "usr_ana",
      ownerUserId: "usr_ana",
      version: 1,
      updatedAt: clock.iso(),
      items: [
        { nftId: FIGMA_IDS.emerald, editionId: "ed-1-50", quantity: 2, priceAtAdd: priceOf(FIGMA_IDS.emerald, "ed-1-50") },
        { nftId: FIGMA_IDS.violet, editionId: "ed-1-50", quantity: 6, priceAtAdd: priceOf(FIGMA_IDS.violet, "ed-1-50") },
        { nftId: FIGMA_IDS.ivory, editionId: "ed-1-10", quantity: 9, priceAtAdd: priceOf(FIGMA_IDS.ivory, "ed-1-10") },
      ],
    };
    carts[cart.id] = cart;
  }

  return {
    schemaVersion: DB_SCHEMA_VERSION,
    meta: { scenario, rngState: DB_RNG_SEED, counters: {} },
    users,
    sessions: {},
    nftState,
    favorites,
    carts,
    wallets,
    quotes: {},
    orders: {},
    idempotency: {},
  };
}

/** Restaura o banco para o seed do cenário e avisa as outras camadas (timers, contadores, injeções). */
export async function resetDb(scenario: ScenarioId): Promise<void> {
  setDb(await buildSeed(scenario));
  persistNow();
  notifyReset();
}
