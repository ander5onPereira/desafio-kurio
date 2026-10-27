import type { NetworkId, Quote, QuoteRequestBody } from "@/contracts";
import { addEth, mulEth, sumEth, subEth } from "@/lib/money";
import { NETWORK_FEES, QUOTE_TTL_MS } from "../config";
import { findCoupon } from "../fixtures/coupons";
import { mutate } from "../db/store";
import type { DbCart, DbQuote } from "../db/types";
import { clock } from "../lib/clock";
import { percentOf, maxZero } from "../lib/decimal";
import { hashValue } from "../lib/hash";
import { flags } from "../scenarios/runtime";
import { itemIdOf, lineInfo } from "./cart";
import { ServerError } from "./errors";

/**
 * Cotação calculada a partir do CARRINHO (+ cupom + rede). É a referência oficial de preços,
 * taxas e totais. A `revision` é um hash do conteúdo: qualquer mudança de preço, estoque, cupom,
 * rede ou taxa gera outra revisão — base da revalidação do pedido (409 QUOTE_CHANGED).
 */
export interface QuoteInput {
  couponCode: string | null;
  network: NetworkId;
}

export const normalizeQuoteInput = (body: QuoteRequestBody): QuoteInput => ({
  couponCode: body.couponCode?.trim() ? body.couponCode.trim().toUpperCase() : null,
  network: body.network ?? "ethereum",
});

function resolveCoupon(code: string | null) {
  if (!code) return null;
  const mode = flags().couponMode;
  if (mode === "invalid") throw new ServerError(422, "COUPON_INVALID", "Cupom inválido.");
  if (mode === "expired") throw new ServerError(422, "COUPON_EXPIRED", "Este cupom expirou.");
  const coupon = findCoupon(code);
  if (!coupon) throw new ServerError(422, "COUPON_INVALID", "Cupom inválido.");
  if (coupon.expired) throw new ServerError(422, "COUPON_EXPIRED", "Este cupom expirou.");
  return coupon;
}

/** Calcula a cotação (sem persistir). */
export function computeQuote(cart: DbCart, input: QuoteInput): Omit<Quote, "id" | "createdAt" | "expiresAt"> {
  const coupon = resolveCoupon(input.couponCode);
  const infos = cart.items.map(lineInfo);

  const lines = infos.map((info) => ({
    itemId: itemIdOf(info.item.nftId, info.item.editionId),
    nftId: info.item.nftId,
    editionId: info.item.editionId,
    name: info.name,
    tokenId: info.tokenId,
    editionLabel: info.editionLabel,
    image: info.image,
    quantity: info.item.quantity,
    unitPrice: info.unitPrice,
    lineTotal: mulEth(info.unitPrice, info.item.quantity),
    available: info.available,
    status: info.status,
  }));

  const subtotal = sumEth(lines.map((line) => line.lineTotal));
  const hasLines = lines.length > 0;

  let discountAmount = "0";
  let discountLabel = "Desconto do lançamento";
  if (coupon?.kind === "percent" && coupon.percent) {
    discountAmount = percentOf(subtotal, coupon.percent);
    discountLabel = `Cupom ${coupon.code} (${coupon.percent}%)`;
  } else if (coupon?.kind === "free-fee") {
    discountLabel = `Cupom ${coupon.code} (taxa de rede grátis)`;
  }

  const networkFee = !hasLines || coupon?.kind === "free-fee" ? "0" : NETWORK_FEES[input.network];
  const total = maxZero(addEth(subEth(subtotal, discountAmount), networkFee));

  const warnings: Quote["warnings"] = [];
  for (const info of infos) {
    if (info.status === "price-changed") {
      warnings.push({ code: "PRICE_CHANGED", message: `O preço de ${info.name} mudou de ${info.item.priceAtAdd} para ${info.unitPrice} ETH.`, nftId: info.item.nftId });
    } else if (info.status === "limited") {
      warnings.push({ code: "LIMITED", message: `${info.name}: só há ${info.maxQuantity} disponível(is).`, nftId: info.item.nftId });
    } else if (info.status === "unavailable") {
      warnings.push({ code: "UNAVAILABLE", message: `${info.name} está indisponível.`, nftId: info.item.nftId });
    }
  }

  const purchasable = hasLines && lines.every((line) => line.status === "ok" || line.status === "price-changed");
  const revision = hashValue({
    lines: lines.map((l) => [l.itemId, l.quantity, l.unitPrice, l.available, l.status]),
    coupon: coupon?.code ?? null,
    network: input.network,
    discountAmount,
    networkFee,
    total,
  });

  return {
    revision,
    lines,
    subtotal,
    discount: { label: discountLabel, amount: discountAmount, couponCode: coupon?.code ?? null },
    networkFee,
    feeEstimated: true,
    total,
    network: input.network,
    warnings,
    purchasable,
  };
}

/** Calcula, registra (para validar o pedido depois) e devolve a cotação. */
export function issueQuote(cart: DbCart, ownerKey: string, input: QuoteInput): Quote {
  const computed = computeQuote(cart, input);
  const now = clock.now();
  const id = `quo_${computed.revision}`;
  const record: DbQuote = {
    id,
    ownerKey,
    revision: computed.revision,
    couponCode: computed.discount.couponCode,
    network: input.network,
    expiresAt: now + QUOTE_TTL_MS,
  };
  mutate((db) => {
    db.quotes[id] = record;
  });
  return { ...computed, id, createdAt: new Date(now).toISOString(), expiresAt: new Date(record.expiresAt).toISOString() };
}

