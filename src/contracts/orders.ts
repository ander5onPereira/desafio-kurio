import { z } from "zod";
import { artworkSchema, ethString, idSchema, isoDate, networkId, walletProvider } from "./common";
import { quoteSchema } from "./quote";

/**
 * Pedido. Fluxo: POST /orders (com header `Idempotency-Key`) → 202 pending →
 * `order.updated` via Socket.IO (ou GET /orders/:id) → confirmed | declined (terminais).
 *
 * Idempotência: mesma chave + mesmo corpo = mesmo pedido (200, header `Idempotent-Replayed: true`);
 * mesma chave + corpo diferente = 409 IDEMPOTENCY_KEY_REUSED.
 */
export const ORDER_STATUSES = ["pending", "confirmed", "declined"] as const;
export const orderStatus = z.enum(ORDER_STATUSES);
export type OrderStatus = z.infer<typeof orderStatus>;
export const isTerminalOrderStatus = (s: OrderStatus) => s === "confirmed" || s === "declined";

export const IDEMPOTENCY_HEADER = "Idempotency-Key";
export const IDEMPOTENT_REPLAY_HEADER = "Idempotent-Replayed";

/** Dados do colecionador (formulário "Perfil do colecionador" do pagamento). */
export const collectorSchema = z.object({
  displayName: z.string().trim().min(2, "Informe o nome de exibição").max(40),
  username: z.string().trim().min(3, "Informe o nome de usuário").max(24),
  profileName: z.string().trim().min(2, "Informe o nome do perfil").max(40),
  email: z.email("E-mail inválido"),
  ensName: z.string().trim().min(3, "Informe o nome ENS").max(60),
  referralCode: z.string().trim().min(4, "Informe o código de indicação").max(24),
  /** "Observação do colecionador (opcional)". */
  note: z.string().trim().max(280, "Máximo de 280 caracteres").optional(),
});
export type Collector = z.infer<typeof collectorSchema>;

export const createOrderBodySchema = z.object({
  quoteId: idSchema,
  quoteRevision: z.string(),
  walletId: idSchema,
  provider: walletProvider,
  network: networkId,
  collector: collectorSchema,
});
export type CreateOrderBody = z.infer<typeof createOrderBodySchema>;

/** Linha do recibo = SNAPSHOT do que foi comprado (imutável, não muda com o catálogo). */
export const orderLineSchema = z.object({
  nftId: idSchema,
  editionId: idSchema,
  name: z.string(),
  tokenId: z.string(),
  editionLabel: z.string(),
  image: artworkSchema,
  quantity: z.number().int().min(1),
  unitPrice: ethString,
  lineTotal: ethString,
});
export type OrderLine = z.infer<typeof orderLineSchema>;

export const orderSchema = z.object({
  id: idSchema,
  status: orderStatus,
  /** Monotônica: cada mudança de estado incrementa. Base do descarte de eventos antigos. */
  version: z.number().int().min(0),
  createdAt: isoDate,
  updatedAt: isoDate,
  lines: z.array(orderLineSchema),
  subtotal: ethString,
  discount: z.object({ label: z.string(), amount: ethString, couponCode: z.string().nullable() }),
  networkFee: ethString,
  total: ethString,
  wallet: z.object({
    id: idSchema,
    nickname: z.string(),
    address: z.string(),
    provider: walletProvider,
    network: networkId,
  }),
  /** Preenchidos só quando confirmed. Simulados. */
  txHash: z.string().nullable(),
  explorerUrl: z.string().nullable(),
  /** Preenchido só quando declined. */
  decline: z.object({ code: z.string(), message: z.string() }).nullable(),
  quoteId: idSchema,
  quoteRevision: z.string(),
});
export type Order = z.infer<typeof orderSchema>;

export const ordersListQuerySchema = z.object({ status: orderStatus.optional() });
export const ordersListResponseSchema = z.object({ items: z.array(orderSchema) });

/** `meta` do 409 QUOTE_CHANGED: a cotação nova para o usuário reconfirmar. */
export const quoteChangedMetaSchema = z.object({ quote: quoteSchema });
/** `meta` do 409 AVAILABILITY_CONFLICT: itens que não têm mais estoque suficiente. */
export const availabilityConflictMetaSchema = z.object({
  items: z.array(
    z.object({
      nftId: idSchema,
      editionId: idSchema,
      name: z.string(),
      requested: z.number().int(),
      available: z.number().int(),
    }),
  ),
});
export type AvailabilityConflictMeta = z.infer<typeof availabilityConflictMetaSchema>;
