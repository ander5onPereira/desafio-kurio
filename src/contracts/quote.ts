import { z } from "zod";
import { artworkSchema, ethString, idSchema, isoDate, lineStatus, networkId } from "./common";

/**
 * Cotação = fonte oficial de preços/taxas/totais. É calculada pelo servidor A PARTIR DO CARRINHO
 * (mais cupom e rede). O front só exibe; nunca soma total por conta própria.
 *
 * `revision` identifica o conteúdo da cotação (hash de linhas + cupom + rede + taxa). Se qualquer
 * coisa mudar (preço, estoque, cupom, taxa), a revisão muda — e o pedido enviado com revisão antiga
 * é recusado com 409 QUOTE_CHANGED (carregando a cotação nova em `meta.quote`).
 */
export const quoteLineSchema = z.object({
  itemId: idSchema,
  nftId: idSchema,
  editionId: idSchema,
  name: z.string(),
  tokenId: z.string(),
  editionLabel: z.string(),
  image: artworkSchema,
  quantity: z.number().int().min(1),
  unitPrice: ethString,
  lineTotal: ethString,
  available: z.number().int().min(0),
  status: lineStatus,
});
export type QuoteLine = z.infer<typeof quoteLineSchema>;

export const quoteWarningSchema = z.object({
  code: z.enum(["PRICE_CHANGED", "LIMITED", "UNAVAILABLE", "COUPON_REMOVED"]),
  message: z.string(),
  nftId: idSchema.nullable(),
});

export const quoteSchema = z.object({
  id: idSchema,
  revision: z.string(),
  createdAt: isoDate,
  expiresAt: isoDate,
  lines: z.array(quoteLineSchema),
  subtotal: ethString,
  discount: z.object({
    label: z.string(),
    amount: ethString,
    couponCode: z.string().nullable(),
  }),
  networkFee: ethString,
  feeEstimated: z.boolean(),
  total: ethString,
  network: networkId,
  warnings: z.array(quoteWarningSchema),
  /** false quando o carrinho está vazio ou há linha indisponível. */
  purchasable: z.boolean(),
});
export type Quote = z.infer<typeof quoteSchema>;

export const quoteRequestBodySchema = z.object({
  couponCode: z.string().trim().min(1).max(32).nullable().optional(),
  network: networkId.optional(),
});
export type QuoteRequestBody = z.infer<typeof quoteRequestBodySchema>;
