import type { QueryClient } from "@tanstack/react-query";
import type {
  Cart,
  FavoritesResponse,
  FeaturedResponse,
  NftDetail,
  NftListResponse,
  NftSummary,
  NftUpdatedEvent,
  Order,
  OrderUpdatedEvent,
  SocketEvent,
} from "@/contracts";
import { compareEth } from "@/lib/money";
import { keys, type Scope } from "@/lib/queryKeys";
import { mergeOrderIntoCache } from "@/modules/orders";
import { nftFloors, patchDetail, patchSummary } from "./nftState";

export interface CartItemChange {
  eventId: string;
  itemId: string;
  nftId: string;
  name: string;
  editionLabel: string;
  priceFrom: string;
  priceTo: string;
  priceChanged: boolean;
  quantity: number;
  available: number;
  availabilityChanged: boolean;
}

/** Efeitos colaterais (toast/anúncio). Injetados para o núcleo ficar testável e rodar UMA vez por evento. */
export interface ApplyEffects {
  onCartItemChanged(change: CartItemChange): void;
  onOrderSettled(order: Order): void;
}

export interface ApplyContext {
  queryClient: QueryClient;
  scope: Scope;
  effects: ApplyEffects;
}

/**
 * Aplica no cache um evento JÁ ACEITO pelo EventGuard (sem duplicata, sem versão antiga, do usuário certo).
 * Nunca toca na UI diretamente: escreve no cache do Query e dispara efeitos injetados.
 */
export function applyEvent(context: ApplyContext, event: SocketEvent): void {
  if (event.type === "nft.updated") applyNftUpdated(context, event);
  else applyOrderUpdated(context, event);
}

function applyNftUpdated({ queryClient, scope, effects }: ApplyContext, event: NftUpdatedEvent): void {
  const { nftId } = event.payload;
  const floor = { version: event.version, payload: event.payload };
  nftFloors.set(nftId, floor);

  // 0) Efeito sobre o carrinho: calculado ANTES de invalidar (precisa do preço/quantidade antigos).
  const cart = queryClient.getQueryData<Cart>(keys.cart(scope));
  for (const item of cart?.items ?? []) {
    if (item.nftId !== nftId) continue;
    const edition = event.payload.editions.find((candidate) => candidate.id === item.editionId);
    if (!edition) continue;
    const priceChanged = compareEth(item.unitPrice, edition.price) !== 0;
    const availabilityChanged = edition.available < item.quantity || edition.available !== item.available;
    if (!priceChanged && !(availabilityChanged && edition.available < item.quantity)) continue;
    effects.onCartItemChanged({
      eventId: event.id,
      itemId: item.id,
      nftId,
      name: item.name,
      editionLabel: item.editionLabel,
      priceFrom: item.unitPrice,
      priceTo: edition.price,
      priceChanged,
      quantity: item.quantity,
      available: edition.available,
      availabilityChanged: edition.available < item.quantity,
    });
  }

  queryClient.setQueryData<NftDetail>(keys.nfts.detail(nftId), (old) => (old ? patchDetail(old, floor) : old));

  queryClient.setQueriesData<NftListResponse>({ queryKey: keys.nfts.lists() }, (old) =>
    old ? { ...old, items: old.items.map((item) => patchSummary(item, floor)) } : old,
  );

  queryClient.setQueryData<FeaturedResponse>(keys.nfts.featured(), (old) =>
    old ? { ...old, spotlight: patchSummary(old.spotlight, floor) } : old,
  );
  queryClient.setQueriesData<{ items: NftSummary[] }>({ queryKey: ["nfts", "related"] }, (old) =>
    old ? { ...old, items: old.items.map((item) => patchSummary(item, floor)) } : old,
  );
  queryClient.setQueryData<FavoritesResponse>(keys.favorites(scope), (old) =>
    old ? { ...old, items: old.items.map((item) => patchSummary(item, floor)) } : old,
  );

  // 4) Carrinho e cotação: o servidor é quem recalcula (resumo e CTA do checkout dependem disso).
  void queryClient.invalidateQueries({ queryKey: keys.cart(scope) });
  void queryClient.invalidateQueries({ queryKey: keys.quotes(scope) });
}

function applyOrderUpdated({ queryClient, scope, effects }: ApplyContext, event: OrderUpdatedEvent): void {
  const incoming = event.payload.order;
  const before = queryClient.getQueryData<Order>(keys.order(scope, incoming.id));
  const winner = mergeOrderIntoCache(queryClient, scope, incoming);
  const changedStatus = !before || before.status !== winner.status;

  if (winner.status === "confirmed") {
    // O servidor removeu do carrinho só o que foi comprado: reflete na tela.
    void queryClient.invalidateQueries({ queryKey: keys.cart(scope) });
    void queryClient.invalidateQueries({ queryKey: keys.quotes(scope) });
  }
  if (changedStatus && winner.status !== "pending") effects.onOrderSettled(winner);
}
