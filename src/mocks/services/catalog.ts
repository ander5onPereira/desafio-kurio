import type {
  FeaturedResponse,
  NftDetail,
  NftFacets,
  NftListQuery,
  NftListResponse,
  NftReviewsResponse,
  NftSummary,
} from "@/contracts";
import { NETWORK_LABELS, NETWORK_IDS } from "@/contracts";
import { compareEth } from "@/lib/money";
import { PAGE_SIZE_DEFAULT } from "../config";
import { CATALOG, COLLECTIONS, FIGMA_IDS, type CatalogNft } from "../fixtures/catalog";
import { buildHeroSlides, buildReviews } from "../fixtures/content";
import { flags } from "../scenarios/runtime";
import { requireCatalogNft, toDetail, toSummary } from "./views";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

interface Row {
  catalog: CatalogNft;
  summary: NftSummary;
  haystack: string;
}

function rows(): Row[] {
  return CATALOG.map((catalog) => {
    const summary = toSummary(catalog);
    return {
      catalog,
      summary,
      haystack: normalize(`${catalog.name} ${catalog.tokenId} ${summary.collection.name} ${catalog.series}`),
    };
  });
}

/** Filtros combináveis; `skip` ignora uma dimensão (para calcular as facetas daquela dimensão). */
function matches(row: Row, query: NftListQuery, skip?: "collection" | "network"): boolean {
  const { summary, catalog } = row;
  if (query.q && !row.haystack.includes(normalize(query.q.trim()))) return false;
  if (skip !== "collection" && query.collection?.length && !query.collection.includes(summary.collection.id)) return false;
  if (skip !== "network" && query.network?.length && !query.network.includes(summary.network)) return false;
  if (query.minPrice !== undefined && compareEth(summary.price, query.minPrice) < 0) return false;
  if (query.maxPrice !== undefined && compareEth(summary.price, query.maxPrice) > 0) return false;
  if (query.tab === "new" && !catalog.isNew) return false;
  if (query.tab === "trending" && !catalog.trending) return false;
  return true;
}

function sortRows(list: Row[], sort: NftListQuery["sort"]): Row[] {
  const sorted = [...list];
  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => compareEth(a.summary.price, b.summary.price) || a.summary.name.localeCompare(b.summary.name));
    case "price-desc":
      return sorted.sort((a, b) => compareEth(b.summary.price, a.summary.price) || a.summary.name.localeCompare(b.summary.name));
    case "name":
      return sorted.sort((a, b) => a.summary.name.localeCompare(b.summary.name));
    default:
      // Mais recentes primeiro (a fixture já nasce nessa ordem; o desempate é o id).
      return sorted.sort((a, b) => (a.summary.createdAt < b.summary.createdAt ? 1 : a.summary.createdAt > b.summary.createdAt ? -1 : a.summary.id.localeCompare(b.summary.id)));
  }
}

function facets(all: Row[], query: NftListQuery): NftFacets {
  const prices = all.map((row) => row.summary.price);
  const min = prices.reduce((acc, price) => (compareEth(price, acc) < 0 ? price : acc), prices[0] ?? "0");
  const max = prices.reduce((acc, price) => (compareEth(price, acc) > 0 ? price : acc), prices[0] ?? "0");
  const forCollections = all.filter((row) => matches(row, query, "collection"));
  const forNetworks = all.filter((row) => matches(row, query, "network"));
  return {
    collections: COLLECTIONS.map((collection) => ({
      id: collection.id,
      name: collection.name,
      count: forCollections.filter((row) => row.summary.collection.id === collection.id).length,
    })),
    networks: NETWORK_IDS.map((id) => ({
      id,
      name: NETWORK_LABELS[id],
      count: forNetworks.filter((row) => row.summary.network === id).length,
    })),
    priceRange: { min, max },
  };
}

export function listNfts(query: NftListQuery): NftListResponse {
  const all = rows();
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? PAGE_SIZE_DEFAULT;

  if (flags().emptyCatalog) {
    const empty = facets(all, query);
    return {
      items: [],
      pagination: { page, pageSize, total: 0, totalPages: 0 },
      facets: {
        collections: empty.collections.map((c) => ({ ...c, count: 0 })),
        networks: empty.networks.map((n) => ({ ...n, count: 0 })),
        priceRange: empty.priceRange,
      },
    };
  }

  const filtered = sortRows(all.filter((row) => matches(row, query)), query.sort);
  const total = filtered.length;
  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize).map((row) => row.summary),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    facets: facets(all, query),
  };
}

export function featured(): FeaturedResponse {
  return { hero: buildHeroSlides(), spotlight: toSummary(requireCatalogNft(FIGMA_IDS.sage)) };
}

export function getNftDetail(nftId: string): NftDetail {
  return toDetail(requireCatalogNft(nftId));
}

/** "Mais desta coleção": para os NFTs do Figma, a mesma seleção do layout; senão, os vizinhos. */
export function relatedNfts(nftId: string): NftSummary[] {
  const base = requireCatalogNft(nftId);
  const pool = [
    FIGMA_IDS.cosmic,
    FIGMA_IDS.violet,
    FIGMA_IDS.ivory,
    FIGMA_IDS.goldenBeat,
    FIGMA_IDS.goldenSignal,
    FIGMA_IDS.sage,
    FIGMA_IDS.neon,
    FIGMA_IDS.goldenFrequency,
  ] as string[];
  const ids = pool.includes(nftId) || nftId === FIGMA_IDS.emerald
    ? pool.filter((id) => id !== nftId)
    : CATALOG.filter((nft) => nft.id !== nftId && nft.series === base.series).slice(0, 8).map((nft) => nft.id);
  return ids.slice(0, 8).map((id) => toSummary(requireCatalogNft(id)));
}

export function nftReviews(nftId: string): NftReviewsResponse {
  const nft = requireCatalogNft(nftId);
  return buildReviews(nft.id, nft.rating.average, nft.rating.count);
}
