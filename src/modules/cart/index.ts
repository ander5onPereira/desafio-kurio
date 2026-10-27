/*
  Módulo de carrinho (Agente D). API pública:
    useCart / useCartCount / useAddToCart / useUpdateCartItem / useRemoveCartItem
  O carrinho de visitante é mesclado ao do usuário AQUI (bridge.ts), observando authStore.subscribe.
*/
import "./bridge";

export { useAddToCart, useCart, useCartCount, useCartScope, useRemoveCartItem, useUpdateCartItem } from "./hooks";
// As páginas NÃO são exportadas aqui (o Header importa este índice): as rotas importam
// direto de "@/modules/cart/components/..." para manter o code splitting por rota.
