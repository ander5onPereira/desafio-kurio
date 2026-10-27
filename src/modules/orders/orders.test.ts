import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { Order } from "@/contracts";
import { keys } from "@/lib/queryKeys";
import { mergeOrderIntoCache, pickNewestOrder } from "./cache";
import { clearDraft, createIdempotencyKey, draftStorageKey, emptyDraft, loadDraft, saveDraft } from "./draft";
import { orderPollInterval } from "./hooks";

const T0 = "2026-01-01T00:00:00.000Z";

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

/** Storage em memória com a mesma interface mínima do sessionStorage. */
function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    keys: () => [...data.keys()],
  };
}

describe("rascunho do checkout", () => {
  it("grava e recupera por usuário (chave com userId)", () => {
    const storage = memoryStorage();
    const draft = { ...emptyDraft(), walletId: "w1", inFlight: true };
    saveDraft(storage, "u1", draft);
    expect(storage.keys()).toEqual([draftStorageKey("u1")]);
    expect(loadDraft(storage, "u1")).toMatchObject({ idempotencyKey: draft.idempotencyKey, walletId: "w1", inFlight: true });
  });

  it("isola usuários: outro userId não lê o rascunho", () => {
    const storage = memoryStorage();
    saveDraft(storage, "u1", emptyDraft());
    expect(loadDraft(storage, "u2")).toBeNull();
  });

  it("ignora conteúdo corrompido ou fora do schema", () => {
    const storage = memoryStorage();
    storage.setItem(draftStorageKey("u1"), "{nao-e-json");
    expect(loadDraft(storage, "u1")).toBeNull();
    storage.setItem(draftStorageKey("u1"), JSON.stringify({ idempotencyKey: "x" }));
    expect(loadDraft(storage, "u1")).toBeNull();
  });

  it("clearDraft remove só o do usuário", () => {
    const storage = memoryStorage();
    saveDraft(storage, "u1", emptyDraft());
    saveDraft(storage, "u2", emptyDraft());
    clearDraft(storage, "u1");
    expect(loadDraft(storage, "u1")).toBeNull();
    expect(loadDraft(storage, "u2")).not.toBeNull();
  });

  it("cada tentativa nova tem uma Idempotency-Key diferente", () => {
    expect(createIdempotencyKey()).not.toBe(createIdempotencyKey());
  });
});

describe("cache de pedidos", () => {
  it("escolhe a versão mais nova e nunca tira um pedido do estado terminal", () => {
    const confirmed = order({ status: "confirmed", version: 3 });
    expect(pickNewestOrder(order({ version: 1 }), confirmed)).toBe(confirmed);
    expect(pickNewestOrder(confirmed, order({ status: "pending", version: 9 }))).toBe(confirmed);
    expect(pickNewestOrder(undefined, confirmed)).toBe(confirmed);
  });

  it("mergeOrderIntoCache grava só se for mais novo", () => {
    const queryClient = new QueryClient();
    mergeOrderIntoCache(queryClient, "u1", order({ version: 2, status: "confirmed" }));
    mergeOrderIntoCache(queryClient, "u1", order({ version: 1, status: "pending" }));
    expect(queryClient.getQueryData<Order>(keys.order("u1", "o1"))?.status).toBe("confirmed");
    // Outro usuário não enxerga o pedido (chave com escopo).
    expect(queryClient.getQueryData(keys.order("u2", "o1"))).toBeUndefined();
  });

  it("polling com backoff: 2 s → 3 s → … limitado a 10 s", () => {
    expect(orderPollInterval(0)).toBe(2000);
    expect(orderPollInterval(1)).toBe(3000);
    expect(orderPollInterval(20)).toBe(10_000);
  });
});
