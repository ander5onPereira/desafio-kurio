import { ethString, type EthString } from "@/contracts";
import { compareEth } from "@/lib/money";
import { mutate, newUuid } from "../db/store";
import { eventLog, publish } from "../realtime/hub";
import { makeNftEvent } from "../realtime/events";
import { ServerError } from "./errors";
import { requireCatalogNft, nftStateOf } from "./views";

/**
 * Alterações administrativas de NFT (preço/estoque). TODA mudança de NFT — vinda do control plane,
 * de um cenário ou de uma compra confirmada — passa por aqui: sobe a versão e publica `nft.updated`,
 * mantendo REST e Socket.IO coerentes.
 */
export interface NftPatch {
  price?: EthString;
  available?: number;
  /** Edição alvo (padrão: a edição padrão do NFT). */
  editionId?: string;
}

export function updateNft(nftId: string, patch: NftPatch): { eventId: string; version: number } {
  const catalog = requireCatalogNft(nftId);
  if (patch.price !== undefined && !ethString.safeParse(patch.price).success) {
    throw new ServerError(422, "VALIDATION_ERROR", "Preço inválido.", { fieldErrors: { price: ["Valor em ETH inválido"] } });
  }
  if (patch.available !== undefined && (!Number.isInteger(patch.available) || patch.available < 0)) {
    throw new ServerError(422, "VALIDATION_ERROR", "Disponibilidade inválida.", { fieldErrors: { available: ["Use um inteiro ≥ 0"] } });
  }

  mutate(() => {
    const state = nftStateOf(nftId);
    const edition = state.editions.find((e) => e.id === (patch.editionId ?? catalog.defaultEditionId));
    if (!edition) throw new ServerError(404, "NOT_FOUND", "Edição não encontrada.");
    if (patch.price !== undefined) {
      edition.price = patch.price;
      // O preço "antigo" só faz sentido se for maior que o atual.
      if (edition.compareAtPrice && compareEth(edition.price, edition.compareAtPrice) >= 0) edition.compareAtPrice = null;
    }
    if (patch.available !== undefined) edition.available = patch.available;
    state.version += 1;
  });

  const event = makeNftEvent(nftId);
  publish(event);
  return { eventId: event.id, version: event.version };
}

/**
 * Reemite um evento OBSOLETO do NFT (versão menor que a atual, id novo). Usa o payload de um evento
 * anterior do log; sem histórico, publica um com `version - 1`.
 */
export function emitStaleNft(nftId: string): void {
  requireCatalogNft(nftId);
  const current = nftStateOf(nftId).version;
  const older = eventLog()
    .map((entry) => entry.event)
    .filter((event) => event.type === "nft.updated" && event.resource.id === nftId && event.version < current)
    .sort((a, b) => a.version - b.version)[0];
  const base = older ?? makeNftEvent(nftId, { version: Math.max(0, current - 1) });
  publish({ ...base, id: newUuid() });
}
