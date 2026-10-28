import { z } from "zod";
import { NETWORK_IDS, NFT_SORTS, NFT_TABS, ethString, type NetworkId, type NftListQuery } from "@/contracts";

/**
 * Estado do catálogo na URL (fonte da verdade): ?q=&collection=&network=&minPrice=&maxPrice=&sort=&tab=&page=
 * Os nomes são os MESMOS de `nftListQuerySchema` — "o que está na URL é o que vai para a API".
 *
 * O Router interpreta valores da URL como JSON quando dá ("2" vira número, `["a"]` vira array),
 * então cada campo aceita string/número e normaliza. Qualquer valor inválido é descartado
 * (`.catch`) em vez de quebrar a página (URL editada à mão, link antigo).
 */
const toStringList = z
  .union([z.array(z.union([z.string(), z.number()])), z.string(), z.number()])
  .transform((value) => (Array.isArray(value) ? value : [value]).map(String).filter((item) => item.length > 0));

const optionalEth = z.coerce.string().pipe(ethString).optional().catch(undefined);

export const catalogSearchSchema = z.object({
  q: z.coerce.string().trim().max(80).optional().catch(undefined),
  collection: toStringList.optional().catch(undefined),
  network: toStringList
    .transform((list) => list.filter((item): item is NetworkId => (NETWORK_IDS as readonly string[]).includes(item)))
    .optional()
    .catch(undefined),
  minPrice: optionalEth,
  maxPrice: optionalEth,
  sort: z.enum(NFT_SORTS).optional().catch(undefined),
  tab: z.enum(NFT_TABS).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});

export type CatalogSearch = z.infer<typeof catalogSearchSchema>;

export function normalizeSearch(search: CatalogSearch): CatalogSearch {
  const next: CatalogSearch = {};
  if (search.q) next.q = search.q;
  if (search.collection?.length) next.collection = search.collection;
  if (search.network?.length) next.network = search.network;
  if (search.minPrice) next.minPrice = search.minPrice;
  if (search.maxPrice) next.maxPrice = search.maxPrice;
  if (search.sort && search.sort !== "recent") next.sort = search.sort;
  if (search.tab && search.tab !== "all") next.tab = search.tab;
  if (search.page && search.page > 1) next.page = search.page;
  return next;
}

export const CATALOG_PAGE_SIZE = 9;

export function toApiQuery(search: CatalogSearch): NftListQuery {
  const query: NftListQuery = { pageSize: CATALOG_PAGE_SIZE };
  if (search.q) query.q = search.q;
  if (search.collection?.length) query.collection = search.collection;
  if (search.network?.length) query.network = search.network;
  if (search.minPrice) query.minPrice = search.minPrice;
  if (search.maxPrice) query.maxPrice = search.maxPrice;
  if (search.sort) query.sort = search.sort;
  if (search.tab) query.tab = search.tab;
  if (search.page && search.page > 1) query.page = search.page;
  return query;
}

/**
 * Aplica uma alteração de filtro. QUALQUER mudança (exceto a própria paginação) reinicia a página.
 * `patch.page` explícito (troca de página) é respeitado.
 */
export function applyPatch(current: CatalogSearch, patch: Partial<CatalogSearch>): CatalogSearch {
  const changesPagination = "page" in patch;
  return normalizeSearch({ ...current, ...patch, page: changesPagination ? patch.page : undefined });
}

export function hasActiveFilters(search: CatalogSearch): boolean {
  return Boolean(search.q || search.collection?.length || search.network?.length || search.minPrice || search.maxPrice);
}
