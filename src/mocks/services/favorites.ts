import type { FavoriteState, FavoritesResponse } from "@/contracts";
import { CATALOG_BY_ID } from "../fixtures/catalog";
import { getDb, mutate } from "../db/store";
import { notFound } from "./errors";
import { toSummary } from "./views";

export function listFavorites(userId: string): FavoritesResponse {
  const ids = getDb().favorites[userId] ?? [];
  const items = ids.flatMap((id) => {
    const nft = CATALOG_BY_ID.get(id);
    return nft ? [toSummary(nft)] : [];
  });
  return { items };
}

export function addFavorite(userId: string, nftId: string): FavoriteState {
  if (!CATALOG_BY_ID.has(nftId)) throw notFound("NFT");
  mutate((db) => {
    const current = db.favorites[userId] ?? [];
    db.favorites[userId] = [nftId, ...current.filter((id) => id !== nftId)];
  });
  return { nftId, favorited: true };
}

export function removeFavorite(userId: string, nftId: string): FavoriteState {
  mutate((db) => {
    db.favorites[userId] = (db.favorites[userId] ?? []).filter((id) => id !== nftId);
  });
  return { nftId, favorited: false };
}
