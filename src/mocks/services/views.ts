import type { NftDetail, NftSummary } from "@/contracts";
import { COLLECTIONS, CATALOG_BY_ID, type CatalogNft } from "../fixtures/catalog";
import { getDb } from "../db/store";
import type { DbEditionState, DbNftState } from "../db/types";
import { notFound } from "./errors";

/** Converte o catálogo estático + estado mutável nos DTOs do contrato. */

export function requireCatalogNft(nftId: string): CatalogNft {
  const nft = CATALOG_BY_ID.get(nftId);
  if (!nft) throw notFound("NFT");
  return nft;
}

export function nftStateOf(nftId: string): DbNftState {
  const state = getDb().nftState[nftId];
  if (!state) throw notFound("NFT");
  return state;
}

export function editionState(nftId: string, editionId: string): DbEditionState | undefined {
  return nftStateOf(nftId).editions.find((edition) => edition.id === editionId);
}

const collectionName = (id: string) => COLLECTIONS.find((collection) => collection.id === id)?.name ?? id;

export function toSummary(nft: CatalogNft): NftSummary {
  const state = nftStateOf(nft.id);
  const edition = state.editions.find((e) => e.id === nft.defaultEditionId) ?? state.editions[0];
  if (!edition) throw new Error(`NFT sem edições: ${nft.id}`);
  return {
    id: nft.id,
    tokenId: nft.tokenId,
    name: nft.name,
    image: { key: nft.artwork, alt: nft.alt },
    price: edition.price,
    compareAtPrice: edition.compareAtPrice,
    rare: nft.rare,
    collection: { id: nft.collectionId, name: collectionName(nft.collectionId) },
    network: nft.network,
    available: state.editions.reduce((sum, e) => sum + e.available, 0),
    version: state.version,
    createdAt: nft.createdAt,
  };
}

export function toDetail(nft: CatalogNft): NftDetail {
  const state = nftStateOf(nft.id);
  return {
    ...toSummary(nft),
    description: nft.description,
    about: nft.about,
    editions: nft.editions.map((catalogEdition) => {
      const current = state.editions.find((e) => e.id === catalogEdition.id);
      return {
        id: catalogEdition.id,
        label: catalogEdition.label,
        supply: catalogEdition.supply,
        available: current?.available ?? 0,
        price: current?.price ?? catalogEdition.price,
        compareAtPrice: current?.compareAtPrice ?? null,
      };
    }),
    defaultEditionId: nft.defaultEditionId,
    attributes: nft.attributes,
    gallery: [1, 2, 3, 4].map(() => ({ key: nft.artwork, alt: nft.alt })),
    rating: nft.rating,
    contract: nft.contract,
    maxPerOrder: nft.maxPerOrder,
    series: nft.series,
  };
}

