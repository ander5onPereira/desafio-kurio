import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { announce } from "@/components/shared";
import type { Quote } from "@/contracts";
import { hasErrorCode, type ApiError } from "@/lib/errors";
import { keys } from "@/lib/queryKeys";
import { useAuth } from "@/modules/auth";
import { useCart, useCartScope } from "@/modules/cart";
import { requestQuote } from "./api";
import { quoteSettings, useQuoteSettings } from "./settings";
import { quoteSignature } from "./signature";

/**
 * Cotação do carrinho atual. É a ÚNICA fonte de subtotal/desconto/taxa/total (nunca somar no front).
 *  - staleTime 0 + chave com a assinatura (cupom, rede, versão do carrinho);
 *  - mantém a cotação anterior na tela enquanto a nova carrega (sem piscar skeleton), só no mesmo usuário;
 *  - cupom salvo que deixou de valer (inválido/expirado) é removido e o motivo vira aviso.
 */
export function useQuote() {
  const { status } = useAuth();
  const scope = useCartScope();
  const cart = useCart();
  const settings = useQuoteSettings();
  const hasItems = (cart.data?.items.length ?? 0) > 0;
  const signature = quoteSignature(settings, cart.data);

  const query = useQuery<Quote, ApiError>({
    queryKey: keys.quote(scope, signature),
    enabled: status !== "loading" && cart.isSuccess && hasItems,
    staleTime: 0,
    gcTime: 60_000,
    placeholderData: (previous, previousQuery) => (previousQuery?.queryKey[1] === scope ? previous : undefined),
    queryFn: async ({ signal }) => {
      const { couponCode, network } = quoteSettings.get();
      try {
        return await requestQuote({ couponCode, network }, signal);
      } catch (error) {
        if (couponCode && hasErrorCode(error, "COUPON_INVALID", "COUPON_EXPIRED")) {
          const expired = hasErrorCode(error, "COUPON_EXPIRED");
          quoteSettings.clearCoupon(
            expired ? `O cupom ${couponCode} expirou e foi removido.` : `O cupom ${couponCode} não é válido e foi removido.`,
          );
          return requestQuote({ network }, signal);
        }
        throw error;
      }
    },
  });

  return query;
}

/** Aplica um cupom: só vira "o cupom atual" se a API aceitar (senão a cotação anterior é mantida). */
export function useApplyCoupon() {
  const queryClient = useQueryClient();
  const scope = useCartScope();
  const cart = useCart();
  return useMutation<Quote, ApiError, string>({
    mutationFn: (code) => requestQuote({ couponCode: code.trim(), network: quoteSettings.get().network }),
    onSuccess: (quote, code) => {
      quoteSettings.setCoupon(code.trim());
      queryClient.setQueryData(keys.quote(scope, quoteSignature(quoteSettings.get(), cart.data)), quote);
      announce(`Cupom ${code.trim()} aplicado`);
    },
  });
}

/** Remove o cupom e recalcula (a mudança de assinatura dispara a nova cotação). */
export function useRemoveCoupon() {
  return () => {
    quoteSettings.clearCoupon();
    announce("Cupom removido");
  };
}
