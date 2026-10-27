import { z } from "zod";
import { ethString, idSchema, isoDate } from "./common";
import { orderSchema } from "./orders";

/**
 * Eventos Socket.IO (servidor → cliente). Transporte: SOMENTE websocket, namespace padrão,
 * eventos de texto (limitações do @mswjs/socket.io-binding — sem acks, sem binário, sem rooms).
 *
 * Todo evento é enviado com o nome do `type` e UM argumento: o envelope abaixo.
 *  - `id`: identidade estável (UUID) → deduplicação.
 *  - `resource` + `version`: recurso afetado e versão monotônica → descarte de eventos antigos.
 *  - `userScope`: quando presente, só vale para esse usuário (defesa extra contra vazamento).
 */
export const SOCKET_PATH = "/socket.io/";

/**
 * Opções de conexão do socket.io-client (ADITIVO, Agente A). Só websocket: o binding do MSW não
 * suporta long-polling. Uso: io(window.location.origin, { ...SOCKET_CLIENT_OPTIONS, auth: cb => cb({ token }) }).
 * IMPORTANTE: importar o socket.io-client DEPOIS de iniciar os mocks (ver docs/progress/A.md).
 */
export const SOCKET_CLIENT_OPTIONS = {
  path: SOCKET_PATH,
  transports: ["websocket"],
  reconnection: true,
  reconnectionDelay: 500,
  reconnectionDelayMax: 4_000,
};
export const SOCKET_EVENT_TYPES = ["nft.updated", "order.updated"] as const;

const envelopeBase = {
  id: z.uuid(),
  version: z.number().int().min(0),
  occurredAt: isoDate,
  userScope: idSchema.optional(),
};

export const nftUpdatedEventSchema = z.object({
  ...envelopeBase,
  type: z.literal("nft.updated"),
  resource: z.object({ kind: z.literal("nft"), id: idSchema }),
  payload: z.object({
    nftId: idSchema,
    /** Preço/estoque da edição padrão e soma de disponibilidade (campos do card). */
    price: ethString,
    compareAtPrice: ethString.nullable(),
    available: z.number().int().min(0),
    /** Estado por edição (preço e estoque), para detalhe e carrinho. */
    editions: z.array(
      z.object({
        id: idSchema,
        price: ethString,
        compareAtPrice: ethString.nullable(),
        available: z.number().int().min(0),
      }),
    ),
  }),
});
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>;

export const orderUpdatedEventSchema = z.object({
  ...envelopeBase,
  type: z.literal("order.updated"),
  resource: z.object({ kind: z.literal("order"), id: idSchema }),
  /** O pedido completo (a versão do envelope = order.version). */
  payload: z.object({ order: orderSchema }),
});
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>;

export const socketEventSchema = z.discriminatedUnion("type", [
  nftUpdatedEventSchema,
  orderUpdatedEventSchema,
]);
export type SocketEvent = z.infer<typeof socketEventSchema>;
