import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Cart, NftDetail, NftListResponse, NftSummary, NftUpdatedEvent, Order, OrderUpdatedEvent } from "@/contracts";
import { keys } from "@/lib/queryKeys";
import { applyEvent, type ApplyEffects } from "./applyEvent";
import { EventGuard } from "./eventGuard";
import { nftFloors, reconcileNftData } from "./nftState";

const T0 = "2026-01-01T00:00:00.000Z";
let counter = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++counter).padStart(12, "0")}`;

const summary = (overrides: Partial<NftSummary> = {}): NftSummary => ({
  id: "n1",
  tokenId: "0042",
  name: "Emerald Ape #042",
  image: { key: "emerald", alt: "Macaco" },
  price: "1.19",
  compareAtPrice: null,
  rare: false,
  collection: { id: "c1", name: "Kurio Apes" },
  network: "ethereum",
  available: 10,
  version: 1,
  createdAt: T0,
  ...overrides,
});

const nftEvent = (version: number, price: string, available = 10, id = uuid()): NftUpdatedEvent => ({
  id,
  type: "nft.updated",
  version,
  occurredAt: T0,
  resource: { kind: "nft", id: "n1" },
  payload: { nftId: "n1", price, compareAtPrice: null, available, editions: [{ id: "e1", price, compareAtPrice: null, available }] },
});

const order = (overrides: Partial<Order> = {}): Order => ({
  id: "o1",
  status: "pending",
  version: 1,
  createdAt: T0,
  updatedAt: T0,
  lines: [],
  subtotal: "0",
  discount: { label: "", amount: "0", couponCode: null },
  networkFee: "0",
  total: "0",
  wallet: { id: "w1", nickname: "Principal", address: "0x0", provider: "metamask", network: "ethereum" },
  txHash: null,
  explorerUrl: null,
  decline: null,
  quoteId: "q1",
  quoteRevision: "r1",
  ...overrides,
});

const orderEvent = (o: Order, userScope?: string): OrderUpdatedEvent => ({
  id: uuid(),
  type: "order.updated",
  version: o.version,
  occurredAt: T0,
  resource: { kind: "order", id: o.id },
  userScope,
  payload: { order: o },
});

describe("EventGuard", () => {
  it("aceita o primeiro evento e descarta duplicata pelo id", () => {
    const guard = new EventGuard();
    const event = nftEvent(2, "1.30");
    expect(guard.check(event, null)).toBe("apply");
    expect(guard.check(event, null)).toBe("duplicate");
  });

  it("descarta evento antigo (versão ≤ conhecida), mesmo com id novo", () => {
    const guard = new EventGuard();
    expect(guard.check(nftEvent(5, "1.5"), null)).toBe("apply");
    expect(guard.check(nftEvent(4, "1.1"), null)).toBe("stale");
    expect(guard.check(nftEvent(5, "1.6"), null)).toBe("stale");
    expect(guard.check(nftEvent(6, "1.7"), null)).toBe("apply");
  });

  it("descarta evento de outro usuário (userScope)", () => {
    const guard = new EventGuard();
    expect(guard.check(orderEvent(order(), "u-outro"), "u1")).toBe("foreign");
    expect(guard.check(orderEvent(order({ version: 2 }), "u1"), "u1")).toBe("apply");
  });

  it("versão vinda do REST também vale como conhecida", () => {
    const guard = new EventGuard();
    guard.noteVersion("nft:n1", 7);
    expect(guard.check(nftEvent(6, "1.0"), null)).toBe("stale");
  });

  it("reset esquece ids e versões (troca de usuário)", () => {
    const guard = new EventGuard();
    const event = nftEvent(3, "1.2");
    guard.check(event, null);
    guard.reset();
    expect(guard.check(event, null)).toBe("apply");
  });

  it("LRU descarta o id mais antigo", () => {
    const guard = new EventGuard(2);
    const [a, b, c] = [nftEvent(1, "1"), nftEvent(2, "1"), nftEvent(3, "1")];
    guard.check(a, null);
    guard.check(b, null);
    guard.check(c, null);
    // `a` saiu do LRU: com versão antiga cai em "stale" (não "duplicate").
    expect(guard.check(a, null)).toBe("stale");
  });
});

describe("applyEvent", () => {
  let queryClient: QueryClient;
  let effects: ApplyEffects;

  beforeEach(() => {
    queryClient = new QueryClient();
    nftFloors.clear();
    effects = { onCartItemChanged: vi.fn(), onOrderSettled: vi.fn() };
  });

  const cart = (): Cart => ({
    id: "cart1",
    version: 1,
    updatedAt: T0,
    totalQuantity: 2,
    items: [
      {
        id: "n1:e1",
        nftId: "n1",
        editionId: "e1",
        quantity: 2,
        name: "Emerald Ape #042",
        tokenId: "0042",
        editionLabel: "1/50",
        image: { key: "emerald", alt: "Macaco" },
        unitPrice: "1.19",
        lineTotal: "2.38",
        available: 10,
        maxQuantity: 10,
        status: "ok",
        priceChangedFrom: null,
        nftVersion: 1,
      },
    ],
  });

  it("nft.updated atualiza lista, detalhe e avisa o carrinho (uma vez)", () => {
    const list: NftListResponse = {
      items: [summary()],
      pagination: { page: 1, pageSize: 9, total: 1, totalPages: 1 },
      facets: { collections: [], networks: [], priceRange: { min: "0", max: "10" } },
    };
    queryClient.setQueryData(keys.nfts.list({ page: 1 }), list);
    queryClient.setQueryData(keys.nfts.detail("n1"), { ...summary(), editions: [{ id: "e1", label: "1/50", supply: 50, available: 10, price: "1.19", compareAtPrice: null }] } as unknown as NftDetail);
    queryClient.setQueryData(keys.cart("u1"), cart());

    applyEvent({ queryClient, scope: "u1", effects }, nftEvent(2, "1.43", 1));

    const updatedList = queryClient.getQueryData<NftListResponse>(keys.nfts.list({ page: 1 }));
    expect(updatedList?.items[0]).toMatchObject({ price: "1.43", available: 1, version: 2 });
    const detail = queryClient.getQueryData<NftDetail>(keys.nfts.detail("n1"));
    expect(detail?.editions[0]).toMatchObject({ price: "1.43", available: 1 });
    expect(effects.onCartItemChanged).toHaveBeenCalledTimes(1);
    expect(effects.onCartItemChanged).toHaveBeenCalledWith(
      expect.objectContaining({ priceFrom: "1.19", priceTo: "1.43", priceChanged: true, availabilityChanged: true }),
    );
  });

  it("não regride: item com versão maior não é sobrescrito por patch antigo", () => {
    queryClient.setQueryData(keys.nfts.detail("n1"), { ...summary({ version: 9, price: "2.00" }), editions: [] } as unknown as NftDetail);
    applyEvent({ queryClient, scope: "guest", effects }, nftEvent(3, "1.00"));
    expect(queryClient.getQueryData<NftDetail>(keys.nfts.detail("n1"))?.price).toBe("2.00");
  });

  it("resposta REST atrasada é corrigida pelo piso do evento", () => {
    applyEvent({ queryClient, scope: "guest", effects }, nftEvent(5, "1.50"));
    const stale: NftListResponse = {
      items: [summary({ version: 4, price: "1.19" })],
      pagination: { page: 1, pageSize: 9, total: 1, totalPages: 1 },
      facets: { collections: [], networks: [], priceRange: { min: "0", max: "10" } },
    };
    const fixed = reconcileNftData("list", stale);
    expect(fixed.items[0]).toMatchObject({ price: "1.50", version: 5 });
    // Já corrigido: devolve a mesma referência (sem laço de escrita no cache).
    expect(reconcileNftData("list", fixed)).toBe(fixed);
  });

  it("order.updated grava o pedido, ignora regressão e avisa a liquidação uma única vez", () => {
    applyEvent({ queryClient, scope: "u1", effects }, orderEvent(order({ status: "pending", version: 1 })));
    expect(effects.onOrderSettled).not.toHaveBeenCalled();

    applyEvent({ queryClient, scope: "u1", effects }, orderEvent(order({ status: "confirmed", version: 2, txHash: "0xabc" })));
    expect(queryClient.getQueryData<Order>(keys.order("u1", "o1"))?.status).toBe("confirmed");
    expect(effects.onOrderSettled).toHaveBeenCalledTimes(1);

    // Evento pendente antigo chegando depois NÃO tira o pedido do estado terminal.
    applyEvent({ queryClient, scope: "u1", effects }, orderEvent(order({ status: "pending", version: 1 })));
    expect(queryClient.getQueryData<Order>(keys.order("u1", "o1"))?.status).toBe("confirmed");
    expect(effects.onOrderSettled).toHaveBeenCalledTimes(1);
  });
});
