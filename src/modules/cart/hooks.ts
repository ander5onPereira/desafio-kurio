import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AddCartItemBody, Cart } from "@/contracts";
import { mulEth } from "@/lib/money";
import type { ApiError } from "@/lib/errors";
import { GUEST_SCOPE, keys, scopeOf } from "@/lib/queryKeys";
import { announce } from "@/components/shared";
import { useAuth } from "@/modules/auth";
import { addCartItem, fetchCart, removeCartItem, updateCartItem } from "./api";
import { ensureGuestCartId } from "./guestCart";

/** Mutations do carrinho com o mesmo escopo rodam EM SÉRIE (sem respostas fora de ordem). */
const CART_MUTATION_SCOPE = { id: "cart-mutations" } as const;

/** Escopo (userId | "guest") do carrinho atual. */
export function useCartScope() {
  const { user } = useAuth();
  return scopeOf(user?.id);
}

/**
 * Carrinho do usuário (token) ou do visitante (X-Cart-Id). staleTime 0: sempre revalida ao montar/focar
 * (preço e estoque mudam em tempo real). Só consulta depois que a sessão foi restaurada.
 */
export function useCart() {
  const { status } = useAuth();
  const scope = useCartScope();
  return useQuery({
    queryKey: keys.cart(scope),
    queryFn: ({ signal }) => {
      if (scope === GUEST_SCOPE) ensureGuestCartId();
      return fetchCart(signal);
    },
    enabled: status !== "loading",
    staleTime: 0,
  });
}

/** Soma das quantidades (badge do Header/BottomNav). */
export function useCartCount(): number {
  return useCart().data?.totalQuantity ?? 0;
}

/** Mensagem curta para o usuário a partir do erro de uma operação de carrinho. */
function cartErrorMessage(error: ApiError, fallback: string): string {
  if (error.code === "AVAILABILITY_CONFLICT") return "Quantidade acima da disponibilidade desta edição.";
  if (error.code === "NOT_FOUND") return "Este NFT não está mais disponível.";
  return error.message || fallback;
}

/**
 * Adiciona (ou soma) um item. O toast de sucesso/erro é emitido AQUI (um único lugar) —
 * quem chama não precisa duplicar o feedback.
 */
export function useAddToCart() {
  const queryClient = useQueryClient();
  const scope = useCartScope();
  return useMutation<Cart, ApiError, AddCartItemBody>({
    scope: CART_MUTATION_SCOPE,
    mutationFn: (body) => {
      if (scope === GUEST_SCOPE) ensureGuestCartId();
      return addCartItem(body);
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(keys.cart(scope), cart);
      void queryClient.invalidateQueries({ queryKey: keys.quotes(scope) });
      toast.success("Adicionado ao carrinho");
      announce("Item adicionado ao carrinho");
    },
    onError: (error) => {
      toast.error(cartErrorMessage(error, "Não foi possível adicionar ao carrinho."));
    },
  });
}

interface UpdateContext {
  previous: Cart | undefined;
}

/**
 * Altera a quantidade com atualização OTIMISTA: aplica na hora, reverte e avisa se a API recusar.
 * O total oficial continua vindo da cotação (invalidada ao final).
 */
export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  const scope = useCartScope();
  return useMutation<Cart, ApiError, { itemId: string; quantity: number }, UpdateContext>({
    scope: CART_MUTATION_SCOPE,
    mutationFn: ({ itemId, quantity }) => updateCartItem(itemId, { quantity }),
    onMutate: async ({ itemId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: keys.cart(scope) });
      const previous = queryClient.getQueryData<Cart>(keys.cart(scope));
      if (previous) {
        const items = previous.items.map((item) =>
          item.id === itemId ? { ...item, quantity, lineTotal: mulEth(item.unitPrice, quantity) } : item,
        );
        queryClient.setQueryData<Cart>(keys.cart(scope), {
          ...previous,
          items,
          totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
        });
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(keys.cart(scope), context.previous);
      toast.error(cartErrorMessage(error, "Não foi possível alterar a quantidade."));
    },
    onSuccess: (cart) => queryClient.setQueryData(keys.cart(scope), cart),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: keys.cart(scope) });
      void queryClient.invalidateQueries({ queryKey: keys.quotes(scope) });
    },
  });
}

/** Remove um item (otimista, com rollback). */
export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  const scope = useCartScope();
  return useMutation<Cart, ApiError, { itemId: string; name?: string }, UpdateContext>({
    scope: CART_MUTATION_SCOPE,
    mutationFn: ({ itemId }) => removeCartItem(itemId),
    onMutate: async ({ itemId }) => {
      await queryClient.cancelQueries({ queryKey: keys.cart(scope) });
      const previous = queryClient.getQueryData<Cart>(keys.cart(scope));
      if (previous) {
        const items = previous.items.filter((item) => item.id !== itemId);
        queryClient.setQueryData<Cart>(keys.cart(scope), {
          ...previous,
          items,
          totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
        });
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(keys.cart(scope), context.previous);
      toast.error(cartErrorMessage(error, "Não foi possível remover o item."));
    },
    onSuccess: (cart, variables) => {
      queryClient.setQueryData(keys.cart(scope), cart);
      announce(`${variables.name ?? "Item"} removido do carrinho`);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: keys.cart(scope) });
      void queryClient.invalidateQueries({ queryKey: keys.quotes(scope) });
    },
  });
}
