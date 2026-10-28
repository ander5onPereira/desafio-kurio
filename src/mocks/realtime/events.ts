import type { NftUpdatedEvent, Order, OrderUpdatedEvent } from "@/contracts";
import { newUuid } from "../db/store";
import { clock } from "../lib/clock";
import { requireCatalogNft, nftStateOf } from "../services/views";

export function makeNftEvent(nftId: string, overrides: { version?: number } = {}): NftUpdatedEvent {
  const catalog = requireCatalogNft(nftId);
  const state = nftStateOf(nftId);
  const main = state.editions.find((e) => e.id === catalog.defaultEditionId) ?? state.editions[0];
  if (!main) throw new Error(`NFT sem edições: ${nftId}`);
  return {
    id: newUuid(),
    type: "nft.updated",
    version: overrides.version ?? state.version,
    occurredAt: clock.iso(),
    resource: { kind: "nft", id: nftId },
    payload: {
      nftId,
      price: main.price,
      compareAtPrice: main.compareAtPrice,
      available: state.editions.reduce((sum, e) => sum + e.available, 0),
      editions: state.editions.map((e) => ({
        id: e.id,
        price: e.price,
        compareAtPrice: e.compareAtPrice,
        available: e.available,
      })),
    },
  };
}

export function makeOrderEvent(order: Order, userId: string): OrderUpdatedEvent {
  return {
    id: newUuid(),
    type: "order.updated",
    version: order.version,
    occurredAt: clock.iso(),
    userScope: userId,
    resource: { kind: "order", id: order.id },
    payload: { order },
  };
}
