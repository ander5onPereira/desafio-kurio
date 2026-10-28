import type { CreateOrderBody, Order, Quote } from "@/contracts";
import { shiftEth } from "../lib/decimal";
import { mulEth, sumEth } from "@/lib/money";
import { ORDER_SETTLE_DELAY_MS, VALID_REFERRAL_CODES } from "../config";
import { getDb, mutate, newId, withRng } from "../db/store";
import type { DbCart, DbOrder, OrderOutcome } from "../db/types";
import { clock } from "../lib/clock";
import { stableStringify, hashString } from "../lib/hash";
import { dropConnections, restoreConnections } from "../realtime/broadcaster";
import { makeOrderEvent } from "../realtime/events";
import { publish } from "../realtime/hub";
import { consumeOnce, flags } from "../scenarios/runtime";
import { ServerError, notFound, validation } from "./errors";
import { removePurchased, resolveCart } from "./cart";
import { updateNft } from "./nftAdmin";
import { computeQuote, issueQuote, normalizeQuoteInput } from "./quote";
import { editionState, requireCatalogNft } from "./views";
import type { DbUser } from "../db/types";

/**
 * Pedidos. Garantias:
 *  - idempotência real (`Idempotency-Key`): mesma chave + mesmo corpo → o mesmo pedido; corpo
 *    diferente → 409 IDEMPOTENCY_KEY_REUSED;
 *  - revalidação no envio: estoque (AVAILABILITY_CONFLICT) e conteúdo da cotação (QUOTE_CHANGED);
 *  - pendente → confirmado | recusado (terminais), com `version` monotônica e evento `order.updated`
 *    SÓ para o dono; o resultado é decidido na criação e sobrevive a refresh (liquidação "preguiçosa");
 *  - o estoque só baixa e o carrinho só perde os itens comprados quando o pedido CONFIRMA;
 *  - o recibo é um snapshot imutável.
 */
const timers = new Set<ReturnType<typeof setTimeout>>();

export function clearOrderTimers(): void {
  for (const timer of timers) clearTimeout(timer);
  timers.clear();
}

const later = (ms: number, fn: () => void) => {
  const timer = setTimeout(() => {
    timers.delete(timer);
    fn();
  }, ms);
  timers.add(timer);
};

export interface CreateOrderResult {
  order: Order;
  replayed: boolean;
  hold: boolean;
}

const requestHashOf = (body: CreateOrderBody) => hashString(stableStringify(body));

function lineEntries(quote: Quote) {
  return quote.lines.map((line) => ({ nftId: line.nftId, editionId: line.editionId, quantity: line.quantity }));
}

function availabilityConflicts(cart: DbCart) {
  return cart.items.flatMap((item) => {
    const catalog = requireCatalogNft(item.nftId);
    const max = Math.min(editionState(item.nftId, item.editionId)?.available ?? 0, catalog.maxPerOrder);
    return item.quantity > max
      ? [{ nftId: item.nftId, editionId: item.editionId, name: catalog.name, requested: item.quantity, available: max }]
      : [];
  });
}

function txHash(): string {
  return `0xA91F${withRng((rng) => rng.hex(56))}E82C`;
}

export function createOrder(user: DbUser, body: CreateOrderBody, idempotencyKey: string | null): CreateOrderResult {
  if (!idempotencyKey?.trim()) {
    throw validation({ "Idempotency-Key": ["O cabeçalho Idempotency-Key é obrigatório."] }, "Idempotency-Key obrigatório.");
  }
  const db = getDb();
  const requestHash = requestHashOf(body);
  const storageKey = `${user.id}:${idempotencyKey}`;

  const existingId = db.idempotency[storageKey];
  if (existingId) {
    const existing = db.orders[existingId];
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new ServerError(409, "IDEMPOTENCY_KEY_REUSED", "Esta chave de idempotência já foi usada com outro conteúdo.");
      }
      settleIfDue(existing.order.id);
      return { order: getDb().orders[existingId]!.order, replayed: true, hold: false };
    }
  }

  const wallet = db.wallets[body.walletId];
  if (!wallet || wallet.userId !== user.id) throw notFound("Carteira");
  if (!VALID_REFERRAL_CODES.some((code) => code === body.collector.referralCode.trim().toUpperCase())) {
    throw validation({ "collector.referralCode": ["Código de indicação inválido."] });
  }

  const cart = resolveCart({ user, guestCartId: null });
  if (cart.items.length === 0) throw new ServerError(422, "VALIDATION_ERROR", "O carrinho está vazio.");

  const f = flags();
  const first = cart.items[0];
  if (first && f.priceChangeOnCheckout && consumeOnce("price-change")) {
    const current = editionState(first.nftId, first.editionId)?.price ?? "0";
    updateNft(first.nftId, { price: shiftEth(current, "0.10"), editionId: first.editionId });
  }
  if (first && f.soldOutOnCheckout && consumeOnce("sold-out")) {
    updateNft(first.nftId, { available: 0, editionId: first.editionId });
  }
  const hold = Boolean(f.orderTimeoutOnce && consumeOnce("order-timeout"));

  const conflicts = availabilityConflicts(cart);
  if (conflicts.length > 0) {
    throw new ServerError(409, "AVAILABILITY_CONFLICT", "Alguns itens não têm mais estoque suficiente.", { meta: { items: conflicts } });
  }

  const stored = db.quotes[body.quoteId];
  const input = stored ? { couponCode: stored.couponCode, network: stored.network } : normalizeQuoteInput({});
  const fresh = computeQuote(cart, input);
  const stale = !stored || stored.revision !== body.quoteRevision || fresh.revision !== body.quoteRevision || clock.now() >= stored.expiresAt;
  if (stale) {
    const quote = issueQuote(cart, user.id, input);
    throw new ServerError(409, "QUOTE_CHANGED", "Preços, estoque ou taxas mudaram. Revise e confirme novamente.", { meta: { quote } });
  }
  const quote = issueQuote(cart, user.id, input);
  if (!quote.purchasable) throw new ServerError(409, "AVAILABILITY_CONFLICT", "Há itens indisponíveis no carrinho.", { meta: { items: availabilityConflicts(cart) } });

  const now = clock.now();
  const outcome: OrderOutcome = f.orderOutcome ?? "confirmed";
  const lines = quote.lines.map((line) => ({
    nftId: line.nftId,
    editionId: line.editionId,
    name: line.name,
    tokenId: line.tokenId,
    editionLabel: line.editionLabel,
    image: line.image,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    lineTotal: mulEth(line.unitPrice, line.quantity),
  }));
  const order: Order = {
    id: "",
    status: "pending",
    version: 1,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    lines,
    subtotal: sumEth(lines.map((l) => l.lineTotal)),
    discount: quote.discount,
    networkFee: quote.networkFee,
    total: quote.total,
    wallet: { id: wallet.id, nickname: wallet.nickname, address: wallet.address, provider: body.provider, network: body.network },
    txHash: null,
    explorerUrl: null,
    decline: null,
    quoteId: quote.id,
    quoteRevision: quote.revision,
  };
  const record = mutate((state) => {
    order.id = newId("ord");
    const dbOrder: DbOrder = {
      order,
      userId: user.id,
      idempotencyKey,
      requestHash,
      outcome,
      settleAt: now + ORDER_SETTLE_DELAY_MS,
      items: lineEntries(quote),
    };
    state.orders[order.id] = dbOrder;
    state.idempotency[storageKey] = order.id;
    return dbOrder;
  });

  scheduleSettle(record);

  // Cenário socket-drop: a conexão cai enquanto o pedido está pendente; o pedido resolve nesse
  // intervalo (evento perdido) e o websocket volta depois — o cliente reconcilia por REST.
  if (f.socketDropOnOrder) {
    dropConnections();
    later(ORDER_SETTLE_DELAY_MS + 2_000, restoreConnections);
  }
  return { order: record.order, replayed: false, hold };
}

function scheduleSettle(record: DbOrder): void {
  const extra = flags().socketDropOnOrder ? 500 : 0;
  later(Math.max(0, record.settleAt - clock.now()) + extra, () => settleOrder(record.order.id, record.outcome));
}

export function rescheduleSettlements(): void {
  for (const record of Object.values(getDb().orders)) {
    if (record.order.status === "pending") scheduleSettle(record);
  }
}

export function settleIfDue(orderId: string): void {
  const record = getDb().orders[orderId];
  if (record && record.order.status === "pending" && clock.now() >= record.settleAt) {
    settleOrder(orderId, record.outcome);
  }
}

export function settleOrder(orderId: string, status: OrderOutcome): Order {
  const record = getDb().orders[orderId];
  if (!record) throw notFound("Pedido");
  if (record.order.status !== "pending") return record.order;

  let finalStatus: OrderOutcome = status;
  let declineCode = "PAYMENT_DECLINED";
  let declineMessage = "Pagamento recusado pela carteira.";

  if (finalStatus === "confirmed") {
    // Estoque pode ter acabado entre a criação e a confirmação (corrida).
    const short = record.items.find((item) => (editionState(item.nftId, item.editionId)?.available ?? 0) < item.quantity);
    if (short) {
      finalStatus = "declined";
      declineCode = "OUT_OF_STOCK";
      declineMessage = "Um dos itens esgotou antes da confirmação.";
    }
  }

  mutate(() => {
    const now = clock.iso();
    record.order = {
      ...record.order,
      status: finalStatus,
      version: record.order.version + 1,
      updatedAt: now,
      txHash: finalStatus === "confirmed" ? txHash() : null,
      explorerUrl: null,
      decline: finalStatus === "declined" ? { code: declineCode, message: declineMessage } : null,
    };
    if (finalStatus === "confirmed") {
      record.order.explorerUrl = `https://etherscan.io/tx/${record.order.txHash}`;
    }
  });

  if (finalStatus === "confirmed") {
    for (const item of record.items) {
      const current = editionState(item.nftId, item.editionId)?.available ?? 0;
      updateNft(item.nftId, { available: current - item.quantity, editionId: item.editionId });
    }
    const cart = getDb().carts[record.userId];
    if (cart) removePurchased(cart, record.items);
  }

  publish(makeOrderEvent(record.order, record.userId));
  return record.order;
}

export function getOrder(user: DbUser, orderId: string): Order {
  const record = getDb().orders[orderId];
  if (!record || record.userId !== user.id) throw notFound("Pedido");
  settleIfDue(orderId);
  return getDb().orders[orderId]!.order;
}

export function listOrders(user: DbUser, status?: Order["status"]): Order[] {
  const own = Object.values(getDb().orders).filter((record) => record.userId === user.id);
  for (const record of own) settleIfDue(record.order.id);
  return Object.values(getDb().orders)
    .filter((record) => record.userId === user.id)
    .map((record) => record.order)
    .filter((order) => !status || order.status === status)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

