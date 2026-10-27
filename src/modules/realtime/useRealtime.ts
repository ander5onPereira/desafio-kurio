import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { announce } from "@/components/shared";
import type { FeaturedResponse, NftDetail, NftListResponse, NftSummary } from "@/contracts";
import { formatEth } from "@/lib/money";
import { queryClient } from "@/lib/queryClient";
import { reconcileNftData } from "./nftState";
import type { ApplyEffects, CartItemChange } from "./applyEvent";
import { realtime, type ConnectionStatus } from "./connection";

/** Mensagem acessível para uma mudança em item do carrinho. */
export function describeCartChange(change: CartItemChange): string {
  const parts: string[] = [];
  if (change.priceChanged) {
    parts.push(`O preço de ${change.name} mudou de ${formatEth(change.priceFrom)} ETH para ${formatEth(change.priceTo)} ETH.`);
  }
  if (change.availabilityChanged) {
    parts.push(
      change.available === 0
        ? `${change.name} (${change.editionLabel}) esgotou.`
        : `Restam apenas ${change.available} de ${change.name} (${change.editionLabel}); você tem ${change.quantity} no carrinho.`,
    );
  }
  return parts.join(" ");
}

/** Efeitos de verdade: toast (Sonner é região `aria-live`) + anúncio; `id` do evento evita repetição. */
const effects: ApplyEffects = {
  onCartItemChanged(change) {
    const message = describeCartChange(change);
    toast.warning("Seu carrinho foi atualizado", { id: `cart-${change.eventId}`, description: message });
    announce(`Carrinho atualizado. ${message}`);
  },
  onOrderSettled(order) {
    if (order.status === "confirmed") {
      toast.success("Pedido confirmado", { id: `order-${order.id}-${order.version}` });
      announce("Pedido confirmado");
    } else {
      toast.error("Pedido recusado", { id: `order-${order.id}-${order.version}`, description: order.decline?.message });
      announce("Pedido recusado", "assertive");
    }
  },
};
realtime.setEffects(effects);

// Resposta REST atrasada (de ANTES de um evento) nunca regride preço/estoque: depois de cada fetch de
// dados de NFT, itens com versão abaixo do piso do evento são corrigidos (sem laço: devolve a mesma
// referência quando nada muda).
queryClient.getQueryCache().subscribe((event) => {
  if (event.type !== "updated" || event.action.type !== "success") return;
  const { queryKey, state } = event.query;
  if (queryKey[0] !== "nfts" || state.data === undefined) return;
  const kind = queryKey[1];
  let next: unknown = state.data;
  try {
    if (kind === "list") next = reconcileNftData("list", state.data as NftListResponse);
    else if (kind === "detail") next = reconcileNftData("detail", state.data as NftDetail);
    else if (kind === "featured") next = reconcileNftData("featured", state.data as FeaturedResponse);
    else if (kind === "related") next = reconcileNftData("related", state.data as { items: NftSummary[] });
  } catch {
    return; // formato inesperado: não mexe
  }
  if (next !== state.data) queryClient.setQueryData(queryKey, next);
});

/**
 * Monte UMA vez no root. Mantém a conexão enquanto o app está aberto; o cleanup solta o consumidor
 * (e, sem consumidores, fecha o socket e remove todos os listeners).
 */
export function useRealtime(): void {
  useEffect(() => realtime.acquire(), []);
}

/** Estado da conexão para o indicador discreto do layout. */
export function useConnectionStatus(): ConnectionStatus {
  return useSyncExternalStore(realtime.subscribeStatus, realtime.getStatus, realtime.getStatus);
}
