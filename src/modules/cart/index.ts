import "./bridge";

export { useAddToCart, useCart, useCartCount, useCartScope, useRemoveCartItem, useUpdateCartItem } from "./hooks";
// As páginas NÃO são exportadas aqui (o Header importa este índice): as rotas importam
// direto de "@/modules/cart/components/..." para manter o code splitting por rota.
