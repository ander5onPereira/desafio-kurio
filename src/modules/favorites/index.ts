/*
  API pública do módulo de favoritos:
    useFavorites()                  // lista (E usa em /perfil/favoritos); só consulta quando autenticado
    useIsFavorite(nftId)            // boolean
    useToggleFavorite()             // mutation({ nft, favorited }) — OTIMISTA com rollback
    FavoriteButton({ nft, variant }) // coração reutilizável (card, detalhe, mobile)
*/
export { useFavorites, useIsFavorite, useToggleFavorite } from "./hooks";
export { FavoriteButton } from "./FavoriteButton";
export type { FavoriteButtonProps } from "./FavoriteButton";
