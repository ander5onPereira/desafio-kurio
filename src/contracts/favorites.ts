import { z } from "zod";
import { idSchema } from "./common";
import { nftSummarySchema } from "./nfts";

/** Favoritos do usuário autenticado ("Lista de interesse"). */
export const favoritesResponseSchema = z.object({ items: z.array(nftSummarySchema) });
export type FavoritesResponse = z.infer<typeof favoritesResponseSchema>;

/** PUT adiciona, DELETE remove; ambos devolvem o estado final (idempotentes). */
export const favoriteStateSchema = z.object({ nftId: idSchema, favorited: z.boolean() });
export type FavoriteState = z.infer<typeof favoriteStateSchema>;
