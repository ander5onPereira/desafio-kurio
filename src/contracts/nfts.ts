import { z } from "zod";
import {
  artworkSchema,
  ethString,
  idSchema,
  isoDate,
  networkId,
  paginationSchema,
} from "./common";

/** Edição de um NFT (chips 1/1, 1/10, 1/50, ABERTA). Cada edição tem estoque e preço próprios. */
export const nftEditionSchema = z.object({
  id: idSchema,
  /** Rótulo exibido: "1/1", "1/10", "1/50", "ABERTA". */
  label: z.string(),
  /** Tiragem total; null = edição aberta (sem limite de tiragem). */
  supply: z.number().int().positive().nullable(),
  available: z.number().int().min(0),
  price: ethString,
  /** Preço antigo (exibido riscado). */
  compareAtPrice: ethString.nullable(),
});
export type NftEdition = z.infer<typeof nftEditionSchema>;

/** Card do catálogo. `price` = preço da edição padrão. */
export const nftSummarySchema = z.object({
  id: idSchema,
  /** Número do token sem "#": "0042". */
  tokenId: z.string(),
  name: z.string(),
  image: artworkSchema,
  price: ethString,
  compareAtPrice: ethString.nullable(),
  /** Selo "RARO". */
  rare: z.boolean(),
  collection: z.object({ id: idSchema, name: z.string() }),
  network: networkId,
  /** Soma da disponibilidade de todas as edições. */
  available: z.number().int().min(0),
  /** Versão monotônica: usada para ignorar eventos/respostas antigos. */
  version: z.number().int().min(0),
  createdAt: isoDate,
});
export type NftSummary = z.infer<typeof nftSummarySchema>;

export const nftDetailSchema = nftSummarySchema.extend({
  description: z.string(),
  /** Parágrafos da aba "Detalhes do NFT". */
  about: z.array(z.string()),
  editions: z.array(nftEditionSchema).min(1),
  defaultEditionId: idSchema,
  attributes: z.array(z.string()),
  /** Imagens da galeria (miniaturas). */
  gallery: z.array(artworkSchema).min(1),
  rating: z.object({ average: z.number().min(0).max(5), count: z.number().int().min(0) }),
  contract: z.object({
    address: z.string(),
    standard: z.string(),
    royaltyPercent: z.number().min(0).max(100),
  }),
  /** Limite por pedido (além da disponibilidade da edição). */
  maxPerOrder: z.number().int().positive(),
  /** Série/coleção de marca exibida em "Coleção: Kurio Apes" (ADITIVO, Agente A). `collection` é a categoria do filtro lateral. */
  series: z.string().optional(),
});
export type NftDetail = z.infer<typeof nftDetailSchema>;

export const NFT_SORTS = ["recent", "price-asc", "price-desc", "name"] as const;
export const NFT_SORT_LABELS: Record<(typeof NFT_SORTS)[number], string> = {
  recent: "Listados recentemente",
  "price-asc": "Menor preço",
  "price-desc": "Maior preço",
  name: "Nome (A–Z)",
};
export const NFT_TABS = ["all", "new", "trending"] as const;
export const NFT_TAB_LABELS: Record<(typeof NFT_TABS)[number], string> = {
  all: "Todos os NFTs",
  new: "Novos lançamentos",
  trending: "Em alta",
};

/**
 * Parâmetros da listagem. São os MESMOS nomes usados na URL do app (search params),
 * então "o que está na URL é o que vai para a API". Padrões no servidor:
 * sort=recent, tab=all, page=1, pageSize=9.
 */
export const nftListQuerySchema = z.object({
  q: z.string().optional(),
  collection: z.array(z.string()).optional(),
  network: z.array(networkId).optional(),
  minPrice: ethString.optional(),
  maxPrice: ethString.optional(),
  sort: z.enum(NFT_SORTS).optional(),
  tab: z.enum(NFT_TABS).optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(48).optional(),
});
export type NftListQuery = z.infer<typeof nftListQuerySchema>;

/** Converte URLSearchParams (strings) em NftListQuery tipado. Usado pelos handlers MSW. */
export function nftListQueryFromSearchParams(sp: URLSearchParams): NftListQuery {
  const raw = {
    q: sp.get("q") ?? undefined,
    collection: sp.getAll("collection"),
    network: sp.getAll("network"),
    minPrice: sp.get("minPrice") ?? undefined,
    maxPrice: sp.get("maxPrice") ?? undefined,
    sort: sp.get("sort") ?? undefined,
    tab: sp.get("tab") ?? undefined,
    page: sp.get("page") ? Number(sp.get("page")) : undefined,
    pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : undefined,
  };
  const parsed = nftListQuerySchema.safeParse({
    ...raw,
    collection: raw.collection.length ? raw.collection : undefined,
    network: raw.network.length ? raw.network : undefined,
  });
  return parsed.success ? parsed.data : {};
}

export const nftFacetsSchema = z.object({
  collections: z.array(z.object({ id: idSchema, name: z.string(), count: z.number().int().min(0) })),
  networks: z.array(z.object({ id: networkId, name: z.string(), count: z.number().int().min(0) })),
  /** Menor e maior preço do catálogo inteiro (limites do slider). */
  priceRange: z.object({ min: ethString, max: ethString }),
});
export type NftFacets = z.infer<typeof nftFacetsSchema>;

export const nftListResponseSchema = z.object({
  items: z.array(nftSummarySchema),
  pagination: paginationSchema,
  facets: nftFacetsSchema,
});
export type NftListResponse = z.infer<typeof nftListResponseSchema>;

export const heroSlideSchema = z.object({
  id: idSchema,
  eyebrow: z.string(),
  title: z.string(),
  description: z.string(),
  ctaLabel: z.string(),
  /** Artes exibidas no slide (a primeira é a principal). */
  images: z.array(artworkSchema).min(1),
  nftId: idSchema,
});
export type HeroSlide = z.infer<typeof heroSlideSchema>;

export const featuredResponseSchema = z.object({
  hero: z.array(heroSlideSchema).min(1),
  /** Card "NFT em destaque / Oferta limitada". */
  spotlight: nftSummarySchema,
});
export type FeaturedResponse = z.infer<typeof featuredResponseSchema>;

export const nftReviewSchema = z.object({
  id: idSchema,
  author: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  createdAt: isoDate,
});
export const nftReviewsResponseSchema = z.object({
  items: z.array(nftReviewSchema),
  average: z.number(),
  count: z.number().int().min(0),
});
export type NftReviewsResponse = z.infer<typeof nftReviewsResponseSchema>;

export const nftRelatedResponseSchema = z.object({ items: z.array(nftSummarySchema) });
