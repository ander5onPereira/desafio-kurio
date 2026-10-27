import type { FavoritesResponse, FeaturedResponse, NftDetail, NftListResponse, NftSummary, NftUpdatedEvent } from "@/contracts";

/**
 * "Piso" de estado por NFT: o último `nft.updated` aceito (versão + preço/estoque por edição).
 *
 * Serve a duas coisas:
 *  1. aplicar o evento no cache (detalhe, listas, destaque, relacionados, favoritos);
 *  2. impedir que uma resposta REST ATRASADA (anterior ao evento) regrida a tela: depois de cada
 *     fetch bem-sucedido de dados de NFT, itens com versão < piso são re-corrigidos (reconcileNftData).
 */
export interface NftFloor {
  version: number;
  payload: NftUpdatedEvent["payload"];
}

const floors = new Map<string, NftFloor>();

export const nftFloors = {
  get: (nftId: string) => floors.get(nftId),
  set: (nftId: string, floor: NftFloor) => {
    const current = floors.get(nftId);
    if (!current || floor.version > current.version) floors.set(nftId, floor);
  },
  clear: () => floors.clear(),
};

export function patchSummary<T extends NftSummary>(item: T, floor: NftFloor): T {
  if (item.version >= floor.version) return item;
  const { price, compareAtPrice, available } = floor.payload;
  return { ...item, price, compareAtPrice, available, version: floor.version };
}

export function patchDetail(detail: NftDetail, floor: NftFloor): NftDetail {
  if (detail.version >= floor.version) return detail;
  const { price, compareAtPrice, available, editions } = floor.payload;
  return {
    ...detail,
    price,
    compareAtPrice,
    available,
    version: floor.version,
    editions: detail.editions.map((edition) => {
      const next = editions.find((candidate) => candidate.id === edition.id);
      return next ? { ...edition, price: next.price, compareAtPrice: next.compareAtPrice, available: next.available } : edition;
    }),
  };
}

function patchSummaries<T extends NftSummary>(items: T[]): T[] {
  let changed = false;
  const next = items.map((item) => {
    const floor = floors.get(item.id);
    if (!floor) return item;
    const patched = patchSummary(item, floor);
    if (patched !== item) changed = true;
    return patched;
  });
  return changed ? next : items;
}

/**
 * Corrige dados de NFT em cache que estejam ATRÁS do piso. Devolve a MESMA referência se nada mudou
 * (o chamador só escreve no cache quando a referência muda → sem laço de atualização).
 */
export function reconcileNftData(kind: "list", data: NftListResponse): NftListResponse;
export function reconcileNftData(kind: "detail", data: NftDetail): NftDetail;
export function reconcileNftData(kind: "featured", data: FeaturedResponse): FeaturedResponse;
export function reconcileNftData(kind: "related", data: { items: NftSummary[] }): { items: NftSummary[] };
export function reconcileNftData(kind: "favorites", data: FavoritesResponse): FavoritesResponse;
export function reconcileNftData(
  kind: "list" | "detail" | "featured" | "related" | "favorites",
  data: NftListResponse | NftDetail | FeaturedResponse | { items: NftSummary[] } | FavoritesResponse,
): unknown {
  switch (kind) {
    case "detail": {
      const detail = data as NftDetail;
      const floor = floors.get(detail.id);
      return floor ? patchDetail(detail, floor) : detail;
    }
    case "featured": {
      const featured = data as FeaturedResponse;
      const floor = floors.get(featured.spotlight.id);
      const spotlight = floor ? patchSummary(featured.spotlight, floor) : featured.spotlight;
      return spotlight === featured.spotlight ? featured : { ...featured, spotlight };
    }
    default: {
      const withItems = data as { items: NftSummary[] };
      const items = patchSummaries(withItems.items);
      return items === withItems.items ? withItems : { ...withItems, items };
    }
  }
}
