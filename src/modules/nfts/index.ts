/*
  API pública do módulo de NFTs (catálogo/detalhe). As PÁGINAS não são exportadas aqui — as rotas
  importam de "@/modules/nfts/components/..." para manter o code splitting por rota.

    NftCard / NftGrid / NftGridSkeleton   // E (favoritos) e D ("Colecionadores também viram")
    useRelatedNfts(nftId)                 // D: "Colecionadores também viram"
    useNftList / useNftDetail             // consultas (chaves em lib/queryKeys: keys.nfts.*)
*/
export { NftCard, NftCardSkeleton } from "./components/NftCard";
export { NftGrid, NftGridSkeleton } from "./components/NftGrid";
export { useFeatured, useNftDetail, useNftList, useRelatedNfts, nftDetailOptions, nftListOptions } from "./hooks";
