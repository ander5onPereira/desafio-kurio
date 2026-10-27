import { endpoints, nftListQueryFromSearchParams } from "@/contracts";
import { featured, getNftDetail, listNfts, nftReviews, relatedNfts } from "../services/catalog";
import { ok, route } from "./route";

/**
 * Catálogo. ATENÇÃO à ordem: `/nfts/featured` precisa vir ANTES de `/nfts/:nftId`,
 * senão "featured" seria lido como um id.
 */
export const nftHandlers = (base: string) => [
  route(base, endpoints.nfts.list, ({ query }) => ok(listNfts(query)), {
    parseQuery: nftListQueryFromSearchParams,
  }),
  route(base, endpoints.nfts.featured, () => ok(featured())),
  route(base, endpoints.nfts.detail, ({ params }) => ok(getNftDetail(params.nftId))),
  route(base, endpoints.nfts.related, ({ params }) => ok({ items: relatedNfts(params.nftId) })),
  route(base, endpoints.nfts.reviews, ({ params }) => ok(nftReviews(params.nftId))),
];
