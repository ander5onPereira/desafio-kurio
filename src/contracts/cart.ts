import { z } from "zod";
import { artworkSchema, ethString, idSchema, isoDate, lineStatus } from "./common";

/**
 * Carrinho. Servidor único para visitante e usuário:
 *  - visitante: header `X-Cart-Id` (UUID guardado no localStorage);
 *  - logado: carrinho do usuário (token Bearer).
 * Ao autenticar, o app chama POST /cart/merge com o id do carrinho de visitante.
 */
export const cartItemSchema = z.object({
  /** Identidade do item = `${nftId}:${editionId}`. */
  id: idSchema,
  nftId: idSchema,
  editionId: idSchema,
  quantity: z.number().int().min(1),
  name: z.string(),
  tokenId: z.string(),
  editionLabel: z.string(),
  image: artworkSchema,
  unitPrice: ethString,
  lineTotal: ethString,
  available: z.number().int().min(0),
  /** min(disponível, máximo por pedido). */
  maxQuantity: z.number().int().min(0),
  status: lineStatus,
  /** Preço anterior quando status = price-changed (para o aviso "mudou de A para B"). */
  priceChangedFrom: ethString.nullable(),
  nftVersion: z.number().int().min(0),
});
export type CartItem = z.infer<typeof cartItemSchema>;

export const cartSchema = z.object({
  id: idSchema,
  items: z.array(cartItemSchema),
  /** Soma das quantidades (é o número do badge do ícone do carrinho). */
  totalQuantity: z.number().int().min(0),
  version: z.number().int().min(0),
  updatedAt: isoDate,
});
export type Cart = z.infer<typeof cartSchema>;

export const MAX_CART_QUANTITY = 99;

export const addCartItemBodySchema = z.object({
  nftId: idSchema,
  editionId: idSchema,
  quantity: z.number().int().min(1).max(MAX_CART_QUANTITY),
});
export type AddCartItemBody = z.infer<typeof addCartItemBodySchema>;

export const updateCartItemBodySchema = z.object({
  quantity: z.number().int().min(1).max(MAX_CART_QUANTITY),
});
export type UpdateCartItemBody = z.infer<typeof updateCartItemBodySchema>;

export const mergeCartBodySchema = z.object({ guestCartId: z.string().min(1) });
export const mergeCartResponseSchema = z.object({
  cart: cartSchema,
  /** Itens ajustados na mescla (limite de quantidade/indisponível). */
  adjustments: z.array(
    z.object({ itemId: idSchema, code: z.enum(["LIMITED", "UNAVAILABLE"]), message: z.string() }),
  ),
});
export type MergeCartResponse = z.infer<typeof mergeCartResponseSchema>;
