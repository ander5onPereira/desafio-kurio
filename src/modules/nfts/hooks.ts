import { keepPreviousData, useQuery, type QueryClient } from "@tanstack/react-query";
import {
  endpoints,
  type FeaturedResponse,
  type NftDetail,
  type NftListQuery,
  type NftListResponse,
  type NftReviewsResponse,
} from "@/contracts";
import { callEndpoint } from "@/lib/api";
import type { ApiError } from "@/lib/errors";
import { keys } from "@/lib/queryKeys";

/*
  Consultas do catálogo. Todas leem/escrevem em `keys.nfts.*` — é nesse cache que o realtime
  (Agente D, evento `nft.updated`) aplica as atualizações de preço e disponibilidade.
*/

export const nftListOptions = (query: NftListQuery) => ({
  queryKey: keys.nfts.list(query),
  queryFn: ({ signal }: { signal: AbortSignal }) => callEndpoint(endpoints.nfts.list, { query, signal }),
  staleTime: 30_000,
  gcTime: 5 * 60_000,
});

export const nftDetailOptions = (nftId: string) => ({
  queryKey: keys.nfts.detail(nftId),
  queryFn: ({ signal }: { signal: AbortSignal }) => callEndpoint(endpoints.nfts.detail, { params: { nftId }, signal }),
  staleTime: 60_000,
  gcTime: 10 * 60_000,
});

/**
 * Listagem do catálogo. `placeholderData: keepPreviousData` mantém a página anterior na tela
 * enquanto a nova carrega (`isPlaceholderData` = atualização em segundo plano). O `signal` do
 * Query cancela a requisição quando os parâmetros mudam: respostas obsoletas são descartadas.
 */
export function useNftList(query: NftListQuery) {
  return useQuery<NftListResponse, ApiError>({ ...nftListOptions(query), placeholderData: keepPreviousData });
}

export function useFeatured() {
  return useQuery<FeaturedResponse, ApiError>({
    queryKey: keys.nfts.featured(),
    queryFn: ({ signal }) => callEndpoint(endpoints.nfts.featured, { signal }),
    staleTime: 60_000,
  });
}

export function useNftDetail(nftId: string) {
  return useQuery<NftDetail, ApiError>(nftDetailOptions(nftId));
}

export function useRelatedNfts(nftId: string) {
  return useQuery({
    queryKey: keys.nfts.related(nftId),
    queryFn: ({ signal }) => callEndpoint(endpoints.nfts.related, { params: { nftId }, signal }),
    staleTime: 60_000,
  });
}

export function useNftReviews(nftId: string) {
  return useQuery<NftReviewsResponse, ApiError>({
    queryKey: keys.nfts.reviews(nftId),
    queryFn: ({ signal }) => callEndpoint(endpoints.nfts.reviews, { params: { nftId }, signal }),
    staleTime: 60_000,
  });
}

/** Aquece o cache do detalhe (hover/foco no card). Erros são ignorados de propósito. */
export function prefetchNftDetail(queryClient: QueryClient, nftId: string) {
  void queryClient.prefetchQuery(nftDetailOptions(nftId));
}
