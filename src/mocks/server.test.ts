import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";
import { endpoints, TEST_COUPONS, TEST_REFERRAL_CODE, TEST_USERS, type CreateOrderBody, type ScenarioId } from "@/contracts";
import { buildRestHandlers } from "./handlers";
import { DB_STORAGE_KEY } from "./config";
import { getDb, installPersistenceHooks, mutate } from "./db/store";
import { resetDb } from "./db/seed";
import { initServer } from "./init";
import { clock } from "./lib/clock";
import { eventLog } from "./realtime/hub";
import { setActiveScenario, setLatencyEnabled } from "./scenarios/runtime";
import { clearOrderTimers, settleOrder } from "./services/orders";
import { updateNft } from "./services/nftAdmin";
import { addInjection } from "./scenarios/runtime";

/**
 * Testes da lógica de SERVIDOR (idempotência, cotação, versões, estoque/limites, merge de carrinho,
 * isolamento por usuário) através dos handlers reais, via msw/node. Sem navegador e sem latência.
 */
const BASE = "http://mock.test/api";
const server = setupServer(...buildRestHandlers(BASE));

interface Call {
  method?: string;
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

type LooseJson = Record<string, ReturnType<typeof JSON.parse>>;

async function call(path: string, { method = "GET", body, token, headers = {}, signal }: Call = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    signal,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, headers: response.headers, json: (text ? JSON.parse(text) : undefined) as LooseJson };
}

async function login(user: keyof typeof TEST_USERS = "ana") {
  const { json } = await call("/auth/login", { method: "POST", body: { email: TEST_USERS[user].email, password: TEST_USERS[user].password } });
  return { token: json.accessToken as string, refreshToken: json.refreshToken as string };
}

async function boot(scenario: ScenarioId = "default") {
  setActiveScenario(scenario);
  await resetDb(scenario);
}

function orderBody(quote: { id: string; revision: string }, walletId = "wal_ana_primary"): CreateOrderBody {
  return {
    quoteId: quote.id,
    quoteRevision: quote.revision,
    walletId,
    provider: "metamask",
    network: "ethereum",
    collector: {
      displayName: "Ana Nova",
      username: "ana.nova",
      profileName: "ana.nova",
      email: "ana@kurio.test",
      ensName: "ana.eth",
      referralCode: TEST_REFERRAL_CODE,
    },
  };
}

beforeAll(async () => {
  server.listen({ onUnhandledRequest: "error" });
  setLatencyEnabled(false);
  await initServer("?scenario=default&reset=1");
});
afterAll(() => {
  clearOrderTimers();
  clock.reset();
  server.close();
});
beforeEach(async () => {
  clock.reset();
  await boot("default");
});

describe("catálogo", () => {
  it("a 1ª página reproduz o Figma (ordem, nomes e preços)", async () => {
    const { status, json } = await call("/nfts");
    expect(status).toBe(200);
    const parsed = endpoints.nfts.list.response.parse(json);
    expect(parsed.items.map((i) => `${i.name} ${i.price}`)).toEqual([
      "Emerald Ape #042 1.19",
      "Sage Nomad #009 1.69",
      "Neon Vessel #552 1.99",
      "Cosmic Bloom #118 1.29",
      "Violet Nomad #314 1.39",
      "Ivory Baron #088 1.79",
      "Golden Beat #207 0.99",
      "Golden Frequency #071 0.59",
      "Golden Signal #160 0.39",
    ]);
    expect(parsed.items[2]).toMatchObject({ compareAtPrice: "2.29", rare: true });
    expect(parsed.pagination.total).toBe(96);
    expect(parsed.facets.collections).toHaveLength(9);
  });

  it("filtros combinam, as facetas acompanham e a paginação respeita o total", async () => {
    const { json } = await call("/nfts?network=polygon&collection=fotografia&collection=musica&sort=price-asc&pageSize=48");
    const parsed = endpoints.nfts.list.response.parse(json);
    expect(parsed.items.every((i) => i.network === "polygon" && ["fotografia", "musica"].includes(i.collection.id))).toBe(true);
    const prices = parsed.items.map((i) => Number(i.price));
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
    // A faceta de rede ignora o filtro de rede (mostra o que existiria nas outras redes).
    expect(parsed.facets.networks.reduce((s, n) => s + n.count, 0)).toBeGreaterThanOrEqual(parsed.items.length);

    const page2 = endpoints.nfts.list.response.parse((await call("/nfts?page=2&pageSize=9")).json);
    expect(page2.items).toHaveLength(9);
    expect(page2.pagination.page).toBe(2);
  });

  it("busca ignora acentos/caixa e filtra por faixa de preço", async () => {
    const byName = endpoints.nfts.list.response.parse((await call("/nfts?q=EMERALD")).json);
    expect(byName.items[0]?.id).toBe("emerald-ape-042");
    const range = endpoints.nfts.list.response.parse((await call("/nfts?minPrice=0.39&maxPrice=0.59&pageSize=48")).json);
    expect(range.items.every((i) => Number(i.price) >= 0.39 && Number(i.price) <= 0.59)).toBe(true);
  });

  it("detalhe do Emerald Ape segue o Figma; id inexistente é 404", async () => {
    const detail = endpoints.nfts.detail.response.parse((await call("/nfts/emerald-ape-042")).json);
    expect(detail).toMatchObject({ tokenId: "0042", series: "Kurio Apes", defaultEditionId: "ed-1-50", rating: { average: 4.8, count: 19 } });
    expect(detail.editions.map((e) => e.label)).toEqual(["1/1", "1/10", "1/50", "ABERTA"]);
    const missing = await call("/nfts/nao-existe");
    expect(missing.status).toBe(404);
    expect(missing.json.code).toBe("NOT_FOUND");
    expect((await call("/nfts/featured")).status).toBe(200);
  });
});

describe("autenticação e isolamento", () => {
  it("login, /me, senha errada e e-mail duplicado no cadastro", async () => {
    const { token } = await login("ana");
    const me = await call("/auth/me", { token });
    expect(me.json).toMatchObject({ username: "ana.nova" });
    expect(JSON.stringify(me.json)).not.toMatch(/password|hash/i);

    const bad = await call("/auth/login", { method: "POST", body: { email: TEST_USERS.ana.email, password: "errada123" } });
    expect(bad.status).toBe(401);

    const dup = await call("/auth/register", { method: "POST", body: { username: "novo.user", email: TEST_USERS.ana.email, password: "Senha123" } });
    expect(dup.status).toBe(409);
    expect(dup.json.code).toBe("EMAIL_TAKEN");
    expect(dup.json.fieldErrors.email).toBeDefined();

    const invalid = await call("/auth/register", { method: "POST", body: { username: "x", email: "nao-e-email", password: "1" } });
    expect(invalid.status).toBe(422);
    expect(Object.keys(invalid.json.fieldErrors)).toEqual(expect.arrayContaining(["username", "email", "password"]));
  });

  it("senhas ficam só como hash PBKDF2 + sal", () => {
    const ana = Object.values(getDb().users).find((u) => u.id === "usr_ana");
    expect(ana?.passwordHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(getDb())).not.toContain(TEST_USERS.ana.password);
  });

  it("refresh rotaciona e o par antigo deixa de valer", async () => {
    const { refreshToken, token } = await login("ana");
    const first = await call("/auth/refresh", { method: "POST", body: { refreshToken } });
    expect(first.status).toBe(200);
    expect(first.json.accessToken).not.toBe(token);
    // O access antigo morreu junto com a rotação…
    expect((await call("/auth/me", { token })).status).toBe(401);
    // …e reutilizar o refresh antigo é recusado.
    const reuse = await call("/auth/refresh", { method: "POST", body: { refreshToken } });
    expect(reuse.status).toBe(401);
    expect(reuse.json.code).toBe("SESSION_EXPIRED");
  });

  it("token vencido pelo relógio responde SESSION_EXPIRED", async () => {
    const { token } = await login("ana");
    clock.set(new Date(clock.now() + 16 * 60_000).toISOString());
    const res = await call("/auth/me", { token });
    expect(res.status).toBe(401);
    expect(res.json.code).toBe("SESSION_EXPIRED");
  });

  it("favoritos e carteiras são isolados por usuário; rotas privadas exigem login", async () => {
    const ana = await login("ana");
    const bruno = await login("bruno");
    const favAna = endpoints.favorites.list.response.parse((await call("/favorites", { token: ana.token })).json);
    const favBruno = endpoints.favorites.list.response.parse((await call("/favorites", { token: bruno.token })).json);
    expect(favAna.items.map((i) => i.id)).toContain("emerald-ape-042");
    expect(favBruno.items.map((i) => i.id)).not.toContain("emerald-ape-042");

    await call("/favorites/golden-signal-160", { method: "PUT", token: bruno.token });
    expect(endpoints.favorites.list.response.parse((await call("/favorites", { token: ana.token })).json).items.map((i) => i.id)).not.toContain("golden-signal-160");
    await call("/favorites/golden-signal-160", { method: "DELETE", token: bruno.token });

    const walletsAna = endpoints.wallets.list.response.parse((await call("/wallets", { token: ana.token })).json);
    const walletsBruno = endpoints.wallets.list.response.parse((await call("/wallets", { token: bruno.token })).json);
    expect(walletsAna.items).toHaveLength(2);
    expect(walletsBruno.items).toHaveLength(1);

    expect((await call("/favorites")).status).toBe(401);
  });
});

describe("carrinho", () => {
  it("visitante adiciona, respeita o limite (409) e o merge soma ao carrinho do usuário", async () => {
    const guest = { "x-cart-id": "guest-1" };
    const added = await call("/cart/items", { method: "POST", headers: guest, body: { nftId: "emerald-ape-042", editionId: "ed-1-50", quantity: 2 } });
    expect(added.status).toBe(201);
    expect(added.json.totalQuantity).toBe(2);

    const tooMany = await call("/cart/items", { method: "POST", headers: guest, body: { nftId: "ivory-baron-088", editionId: "ed-1-10", quantity: 11 } });
    expect(tooMany.status).toBe(409);
    expect(tooMany.json.code).toBe("AVAILABILITY_CONFLICT");
    expect(tooMany.json.meta.items[0]).toMatchObject({ nftId: "ivory-baron-088", available: 10 });

    const { token } = await login("ana");
    await call("/cart/items", { method: "POST", token, body: { nftId: "emerald-ape-042", editionId: "ed-1-50", quantity: 1 } });
    const merged = endpoints.cart.merge.response.parse((await call("/cart/merge", { method: "POST", token, body: { guestCartId: "guest-1" } })).json);
    expect(merged.cart.items.find((i) => i.nftId === "emerald-ape-042")?.quantity).toBe(3);
    // O carrinho de visitante deixou de existir.
    expect(endpoints.cart.get.response.parse((await call("/cart", { headers: guest })).json).items).toHaveLength(0);
  });

  it("estado da linha acompanha preço e estoque do NFT (e muda a versão)", async () => {
    const { token } = await login("ana");
    await call("/cart/items", { method: "POST", token, body: { nftId: "golden-beat-207", editionId: "ed-1-50", quantity: 2 } });
    const before = updateNft("golden-beat-207", { price: "1.09", editionId: "ed-1-50" });
    const cart = endpoints.cart.get.response.parse((await call("/cart", { token })).json);
    expect(cart.items[0]).toMatchObject({ status: "price-changed", unitPrice: "1.09", priceChangedFrom: "0.99" });
    const after = updateNft("golden-beat-207", { available: 1, editionId: "ed-1-50" });
    expect(after.version).toBe(before.version + 1);
    const limited = endpoints.cart.get.response.parse((await call("/cart", { token })).json);
    expect(limited.items[0]?.status).toBe("limited");
  });
});

describe("cotação", () => {
  it("cenário figma: 26.83 + 0.016 = 26.846", async () => {
    await boot("figma");
    const { token } = await login("ana");
    const quote = endpoints.quotes.create.response.parse((await call("/quotes", { method: "POST", token, body: {} })).json);
    expect(quote).toMatchObject({ subtotal: "26.83", networkFee: "0.016", total: "26.846", feeEstimated: true, purchasable: true });
    expect(quote.discount.amount).toBe("0");
    expect(quote.lines.map((l) => [l.name, l.quantity, l.lineTotal])).toEqual([
      ["Emerald Ape #042", 2, "2.38"],
      ["Violet Nomad #314", 6, "8.34"],
      ["Ivory Baron #088", 9, "16.11"],
    ]);
  });

  it("cupons: válido (10%), expirado, inexistente e taxa grátis", async () => {
    await boot("figma");
    const { token } = await login("ana");
    const withCoupon = endpoints.quotes.create.response.parse((await call("/quotes", { method: "POST", token, body: { couponCode: TEST_COUPONS.valid } })).json);
    expect(withCoupon).toMatchObject({ subtotal: "26.83", total: "24.163" });
    expect(withCoupon.discount.amount).toBe("2.683");

    const expired = await call("/quotes", { method: "POST", token, body: { couponCode: TEST_COUPONS.expired } });
    expect(expired.status).toBe(422);
    expect(expired.json.code).toBe("COUPON_EXPIRED");
    expect((await call("/quotes", { method: "POST", token, body: { couponCode: TEST_COUPONS.invalid } })).json.code).toBe("COUPON_INVALID");

    const free = endpoints.quotes.create.response.parse((await call("/quotes", { method: "POST", token, body: { couponCode: TEST_COUPONS.freeFee } })).json);
    expect(free).toMatchObject({ networkFee: "0", total: "26.83" });
  });

  it("a revisão muda quando preço, estoque, cupom ou rede mudam", async () => {
    await boot("figma");
    const { token } = await login("ana");
    const q = async (body: object) => endpoints.quotes.create.response.parse((await call("/quotes", { method: "POST", token, body })).json);
    const base = await q({});
    expect((await q({})).revision).toBe(base.revision);
    expect((await q({ network: "polygon" })).revision).not.toBe(base.revision);
    expect((await q({ couponCode: TEST_COUPONS.valid })).revision).not.toBe(base.revision);
    updateNft("emerald-ape-042", { price: "1.20", editionId: "ed-1-50" });
    expect((await q({})).revision).not.toBe(base.revision);
  });
});

describe("pedidos", () => {
  async function setupCheckout() {
    await boot("figma");
    const { token } = await login("ana");
    const quote = endpoints.quotes.create.response.parse((await call("/quotes", { method: "POST", token, body: {} })).json);
    return { token, quote };
  }

  it("idempotência: mesma chave+corpo devolve o mesmo pedido; corpo diferente é 409", async () => {
    const { token, quote } = await setupCheckout();
    const body = orderBody(quote);
    const first = await call("/orders", { method: "POST", token, headers: { "idempotency-key": "k-1" }, body });
    expect(first.status).toBe(202);
    const order = endpoints.orders.create.response.parse(first.json);
    expect(order).toMatchObject({ status: "pending", version: 1, total: "26.846" });

    const replay = await call("/orders", { method: "POST", token, headers: { "idempotency-key": "k-1" }, body });
    expect(replay.status).toBe(200);
    expect(replay.headers.get("idempotent-replayed")).toBe("true");
    expect(replay.json.id).toBe(order.id);
    expect(Object.keys(getDb().orders)).toHaveLength(1);

    const reused = await call("/orders", { method: "POST", token, headers: { "idempotency-key": "k-1" }, body: { ...body, provider: "coinbase" } });
    expect(reused.status).toBe(409);
    expect(reused.json.code).toBe("IDEMPOTENCY_KEY_REUSED");

    expect((await call("/orders", { method: "POST", token, body })).status).toBe(422); // sem Idempotency-Key
  });

  it("revalida: preço mudou → QUOTE_CHANGED com a cotação nova; estoque curto → AVAILABILITY_CONFLICT", async () => {
    const { token, quote } = await setupCheckout();
    updateNft("emerald-ape-042", { price: "1.29", editionId: "ed-1-50" });
    const changed = await call("/orders", { method: "POST", token, headers: { "idempotency-key": "k-2" }, body: orderBody(quote) });
    expect(changed.status).toBe(409);
    expect(changed.json.code).toBe("QUOTE_CHANGED");
    expect(changed.json.meta.quote.total).not.toBe(quote.total);
    expect(Object.keys(getDb().orders)).toHaveLength(0);

    // Reconfirmando com a cotação nova o pedido passa.
    const fresh = endpoints.quotes.create.response.parse(changed.json.meta.quote);
    const ok = await call("/orders", { method: "POST", token, headers: { "idempotency-key": "k-3" }, body: orderBody(fresh) });
    expect(ok.status).toBe(202);

    updateNft("ivory-baron-088", { available: 3, editionId: "ed-1-10" });
    const short = await call("/orders", { method: "POST", token, headers: { "idempotency-key": "k-4" }, body: orderBody(fresh) });
    expect(short.status).toBe(409);
    expect(short.json.code).toBe("AVAILABILITY_CONFLICT");
    expect(short.json.meta.items[0]).toMatchObject({ nftId: "ivory-baron-088", requested: 9, available: 3 });
  });

  it("confirmar: versão sobe, estoque baixa, carrinho perde só o comprado, recibo é snapshot e o evento vai só ao dono", async () => {
    const { token, quote } = await setupCheckout();
    // Itens extras no carrinho DEPOIS da cotação não podem ser removidos pela compra.
    const created = endpoints.orders.create.response.parse((await call("/orders", { method: "POST", token, headers: { "idempotency-key": "k-5" }, body: orderBody(quote) })).json);
    await call("/cart/items", { method: "POST", token, body: { nftId: "golden-beat-207", editionId: "ed-1-50", quantity: 1 } });

    const stockBefore = getDb().nftState["ivory-baron-088"]!.editions.find((e) => e.id === "ed-1-10")!.available;
    const settled = settleOrder(created.id, "confirmed");
    expect(settled).toMatchObject({ status: "confirmed", version: 2 });
    expect(settled.txHash).toMatch(/^0xA91F[0-9a-f]{56}E82C$/);
    expect(getDb().nftState["ivory-baron-088"]!.editions.find((e) => e.id === "ed-1-10")!.available).toBe(stockBefore - 9);

    const cart = endpoints.cart.get.response.parse((await call("/cart", { token })).json);
    expect(cart.items.map((i) => i.nftId)).toEqual(["golden-beat-207"]);

    // Recibo imutável: mudar o catálogo depois não altera o pedido.
    updateNft("emerald-ape-042", { price: "9.99", editionId: "ed-1-50" });
    const receipt = endpoints.orders.get.response.parse((await call(`/orders/${created.id}`, { token })).json);
    expect(receipt.lines[0]?.unitPrice).toBe("1.19");
    expect(receipt.total).toBe("26.846");

    // Estados terminais não mudam.
    expect(settleOrder(created.id, "declined").status).toBe("confirmed");

    const orderEvents = eventLog().filter((e) => e.event.type === "order.updated");
    expect(orderEvents).toHaveLength(1);
    expect(orderEvents[0]).toMatchObject({ audience: "usr_ana" });
    expect(orderEvents[0]?.event.version).toBe(2);

    // Outro usuário não enxerga o pedido.
    const bruno = await login("bruno");
    expect((await call(`/orders/${created.id}`, { token: bruno.token })).status).toBe(404);
  });

  it("liquidação preguiçosa: ao avançar o relógio, GET já devolve o pedido resolvido; recusa mantém estoque e carrinho", async () => {
    await boot("figma");
    setActiveScenario("payment-declined");
    const { token } = await login("ana");
    const quote = endpoints.quotes.create.response.parse((await call("/quotes", { method: "POST", token, body: {} })).json);
    const created = endpoints.orders.create.response.parse((await call("/orders", { method: "POST", token, headers: { "idempotency-key": "k-6" }, body: orderBody(quote) })).json);
    expect(created.status).toBe("pending");
    clock.set(new Date(clock.now() + 5_000).toISOString());
    const pending = endpoints.orders.list.response.parse((await call("/orders?status=pending", { token })).json);
    expect(pending.items).toHaveLength(0);
    const declined = endpoints.orders.get.response.parse((await call(`/orders/${created.id}`, { token })).json);
    expect(declined).toMatchObject({ status: "declined", decline: { code: "PAYMENT_DECLINED" }, txHash: null });
    expect(endpoints.cart.get.response.parse((await call("/cart", { token })).json).items).toHaveLength(3);
  });
});

describe("cenários", () => {
  it("price-changed-on-checkout: a 1ª compra dispara QUOTE_CHANGED (uma vez por reset)", async () => {
    await boot("figma");
    setActiveScenario("price-changed-on-checkout");
    const { token } = await login("ana");
    const quote = endpoints.quotes.create.response.parse((await call("/quotes", { method: "POST", token, body: {} })).json);
    const first = await call("/orders", { method: "POST", token, headers: { "idempotency-key": "p-1" }, body: orderBody(quote) });
    expect(first.status).toBe(409);
    expect(first.json.code).toBe("QUOTE_CHANGED");
    expect(eventLog().some((e) => e.event.type === "nft.updated" && e.event.resource.id === "emerald-ape-042")).toBe(true);
    const fresh = endpoints.quotes.create.response.parse(first.json.meta.quote);
    expect((await call("/orders", { method: "POST", token, headers: { "idempotency-key": "p-2" }, body: orderBody(fresh) })).status).toBe(202);
  });

  it("sold-out-on-checkout: estoque zera e o pedido é recusado com AVAILABILITY_CONFLICT", async () => {
    await boot("figma");
    setActiveScenario("sold-out-on-checkout");
    const { token } = await login("ana");
    const quote = endpoints.quotes.create.response.parse((await call("/quotes", { method: "POST", token, body: {} })).json);
    const res = await call("/orders", { method: "POST", token, headers: { "idempotency-key": "s-1" }, body: orderBody(quote) });
    expect(res.status).toBe(409);
    expect(res.json.code).toBe("AVAILABILITY_CONFLICT");
  });

  it("order-timeout: o pedido É criado, a resposta não chega e reenviar com a mesma chave recupera o mesmo pedido", async () => {
    await boot("figma");
    setActiveScenario("order-timeout");
    const { token } = await login("ana");
    const quote = endpoints.quotes.create.response.parse((await call("/quotes", { method: "POST", token, body: {} })).json);
    const body = orderBody(quote);
    await expect(call("/orders", { method: "POST", token, headers: { "idempotency-key": "t-1" }, body, signal: AbortSignal.timeout(400) })).rejects.toThrow();
    expect(Object.keys(getDb().orders)).toHaveLength(1);
    const replay = await call("/orders", { method: "POST", token, headers: { "idempotency-key": "t-1" }, body });
    expect(replay.status).toBe(200);
    expect(replay.headers.get("idempotent-replayed")).toBe("true");
    expect(Object.keys(getDb().orders)).toHaveLength(1);
  });

  it("server-errors: leituras falham 3× e depois funcionam; /auth não é afetado", async () => {
    await boot("server-errors");
    expect((await login("ana")).token).toBeTruthy();
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) statuses.push((await call("/nfts/featured")).status);
    expect(statuses).toEqual([503, 500, 503, 200]);
  });

  it("session-expired: access de 60 s e refresh sempre falha", async () => {
    await boot("session-expired");
    const { token, refreshToken } = await login("ana");
    clock.set(new Date(clock.now() + 61_000).toISOString());
    expect((await call("/auth/me", { token })).json.code).toBe("SESSION_EXPIRED");
    expect((await call("/auth/refresh", { method: "POST", body: { refreshToken } })).status).toBe(401);
  });

  it("coupon-invalid / register-conflict / wallet-rejected / empty", async () => {
    await boot("register-conflict");
    const reg = await call("/auth/register", { method: "POST", body: { username: "inedito.user", email: "inedito@kurio.test", password: "Senha123" } });
    expect(reg.status).toBe(409);

    await boot("wallet-rejected");
    const { token } = await login("ana");
    const rejected = await call("/wallets/connect", { method: "POST", token, body: { provider: "metamask", network: "ethereum" } });
    expect(rejected.status).toBe(422);
    expect(rejected.json.code).toBe("WALLET_REJECTED");

    await boot("empty");
    const empty = endpoints.nfts.list.response.parse((await call("/nfts")).json);
    expect(empty.items).toHaveLength(0);
    expect(empty.pagination.total).toBe(0);
  });

  it("injeção pontual: falha só as próximas N chamadas", async () => {
    addInjection({ method: "get", path: "/nfts/featured", behavior: { type: "status", status: 503 }, times: 2 });
    expect([(await call("/nfts/featured")).status, (await call("/nfts/featured")).status, (await call("/nfts/featured")).status]).toEqual([503, 503, 200]);
  });

  it("reset restaura o cenário por completo (sessões, pedidos, estoque e versões)", async () => {
    await boot("figma");
    const { token } = await login("ana");
    updateNft("emerald-ape-042", { available: 0, editionId: "ed-1-50" });
    await call("/favorites/golden-signal-160", { method: "PUT", token });
    await resetDb("figma");
    expect(Object.keys(getDb().sessions)).toHaveLength(0);
    expect(getDb().nftState["emerald-ape-042"]).toMatchObject({ version: 1 });
    expect(getDb().favorites["usr_ana"]).not.toContain("golden-signal-160");
    expect(getDb().carts["usr_ana"]?.items).toHaveLength(3);
  });
});

describe("eventos de NFT", () => {
  it("toda mudança publica nft.updated com versão monotônica e id único", () => {
    const a = updateNft("sage-nomad-009", { price: "1.70" });
    const b = updateNft("sage-nomad-009", { price: "1.71" });
    expect(b.version).toBe(a.version + 1);
    const events = eventLog().filter((e) => e.event.type === "nft.updated");
    expect(events.map((e) => e.event.version)).toEqual([a.version, b.version]);
    expect(new Set(events.map((e) => e.event.id)).size).toBe(2);
    expect(events[0]?.audience).toBeNull();
  });
});

describe("persistência", () => {
  it("grava de forma síncrona em pagehide/visibilitychange (sem esperar o debounce) e o reset segue funcionando", async () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, value),
      removeItem: (key: string) => void storage.delete(key),
    });
    try {
      const win = new EventTarget();
      const doc = Object.assign(new EventTarget(), { visibilityState: "visible" });
      installPersistenceHooks(win, doc);

      await resetDb("default");
      mutate((db) => {
        db.favorites["usr_ana"] = ["golden-signal-160"];
      });
      storage.delete(DB_STORAGE_KEY); // o debounce (120 ms) ainda não gravou…
      win.dispatchEvent(new Event("pagehide")); // …mas o refresh grava na hora
      expect(JSON.parse(storage.get(DB_STORAGE_KEY)!).favorites.usr_ana).toEqual(["golden-signal-160"]);

      storage.delete(DB_STORAGE_KEY);
      doc.visibilityState = "visible";
      doc.dispatchEvent(new Event("visibilitychange"));
      expect(storage.has(DB_STORAGE_KEY)).toBe(false); // visível: não grava
      doc.visibilityState = "hidden";
      doc.dispatchEvent(new Event("visibilitychange"));
      expect(storage.has(DB_STORAGE_KEY)).toBe(true);

      await resetDb("figma");
      expect(JSON.parse(storage.get(DB_STORAGE_KEY)!).meta.scenario).toBe("figma");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
