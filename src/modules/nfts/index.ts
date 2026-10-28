/*
  API pública do módulo de NFTs (catálogo/detalhe). As PÁGINAS não são exportadas aqui — as rotas
  importam de "@/modules/nfts/components/..." para manter o code splitting por rota.
*/
export { NftCard, NftCardSkeleton } from "./components/NftCard";
export { NftGrid, NftGridSkeleton } from "./components/NftGrid";
export { useFeatured, useNftDetail, useNftList, useRelatedNfts, nftDetailOptions, nftListOptions } from "./hooks";
