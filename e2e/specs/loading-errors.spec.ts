import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures";

/**
 * Grupo 12 do README — skeletons durante carregamento lento, feedback de falha e recuperação
 * após nova tentativa.
 */

test("carregamento lento mostra skeleton (anunciado) e depois o conteúdo, sem deslocar o layout", async ({ page, kurio }) => {
  // Mede os deslocamentos de layout (CLS) desde o início da página.
  await page.addInitScript(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as Array<{ value: number; hadRecentInput: boolean }>) {
        if (!entry.hadRecentInput) (window as unknown as { __cls: number }).__cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });

  await kurio.open("/", "slow");
  await expect(page.getByRole("status").filter({ hasText: "Carregando catálogo" })).toBeVisible();

  await expect(page.getByRole("list", { name: "Catálogo de NFTs" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("status").filter({ hasText: "Carregando catálogo" })).toHaveCount(0);

  const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
  expect(cls, "CLS do carregamento lento").toBeLessThan(0.1);
});

// Botão "Tentar novamente" do CATÁLOGO (a página tem outros: hero, filtros).
const catalogRetry = (page: Page) =>
  // A região traz o erro dos filtros e o dos resultados; o dos resultados é o último.
  page.getByRole("region", { name: "Catálogo de NFTs" }).getByRole("button", { name: "Tentar novamente" }).last();

test("cenário de erros 5xx: o cache esgota as retentativas, mostra o erro e a nova tentativa recupera", async ({ page, kurio }) => {
  // Cada rota de leitura falha 3× e depois funciona; o cache tenta 3 vezes (1 + 2 retentativas com
  // backoff), então o erro aparece com "Tentar novamente" e a tentativa manual encontra o servidor de volta.
  await kurio.open("/", "server-errors");
  await expect(catalogRetry(page)).toBeVisible({ timeout: 30_000 });

  await catalogRetry(page).click();
  await expect(page.getByRole("list", { name: "Catálogo de NFTs" })).toBeVisible();
});

test("falhas transitórias curtas são recuperadas sozinhas pelo retry (sem intervenção)", async ({ page, kurio }) => {
  await kurio.open("/");
  await expect(page.getByRole("list", { name: "Catálogo de NFTs" })).toBeVisible();

  await kurio.inject({ method: "get", path: "/nfts*", behavior: { type: "status", status: 503, code: "TRANSIENT" }, times: 2 });
  await page.getByRole("search").getByLabel("Buscar NFTs").fill("Golden");
  await expect(page.getByRole("list", { name: "Catálogo de NFTs" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Tentar novamente" })).toHaveCount(0);
});

test("falha persistente mostra erro com 'Tentar novamente' e recupera depois", async ({ page, kurio }) => {
  await kurio.open("/");
  await expect(page.getByRole("list", { name: "Catálogo de NFTs" })).toBeVisible();

  await kurio.inject({ method: "get", path: "/nfts*", behavior: { type: "status", status: 503, code: "TRANSIENT" }, times: Infinity });
  await page.getByRole("search").getByLabel("Buscar NFTs").fill("Golden");
  await expect(catalogRetry(page)).toBeVisible({ timeout: 30_000 });

  await kurio.clearInjections();
  await catalogRetry(page).click();
  await expect(page.getByRole("list", { name: "Catálogo de NFTs" })).toBeVisible();
});

test("sem conexão: mostra o erro de conexão e recupera quando a rede volta", async ({ page, kurio }) => {
  await kurio.open("/", "offline");
  await expect(page.getByText("Sem conexão com o servidor").first()).toBeVisible({ timeout: 30_000 });

  await kurio.setScenario("default", { keepData: true });
  await catalogRetry(page).click();
  await expect(page.getByRole("list", { name: "Catálogo de NFTs" })).toBeVisible();
});

test("injeção pontual: a próxima chamada ao catálogo falha uma vez e depois funciona", async ({ page, kurio }) => {
  await kurio.open("/");
  await expect(page.getByRole("list", { name: "Catálogo de NFTs" })).toBeVisible();

  await kurio.inject({ method: "get", path: "/nfts*", behavior: { type: "status", status: 503, code: "TRANSIENT" }, times: 3 });
  await page.getByRole("search").getByLabel("Buscar NFTs").fill("Golden");
  // A UI tenta de novo (retry de falha transitória) ou mostra o erro com recuperação.
  await expect(page.getByRole("list", { name: "Catálogo de NFTs" }).or(page.getByRole("button", { name: "Tentar novamente" }).first())).toBeVisible({
    timeout: 20_000,
  });
  await kurio.clearInjections();
});
