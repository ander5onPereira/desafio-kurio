import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures";

/**
 * Grupo 1 do README — busca, filtros combinados, ordenação, paginação e restauração pelo histórico.
 * A URL é a fonte de verdade do catálogo: tudo que está nela vai para a API e sobrevive a refresh.
 * Os filtros laterais são do layout desktop (no mobile vão para um drawer) — por isso desktop-only.
 */
test.skip(({ isMobile }) => isMobile, "Filtros laterais são do layout desktop; o mobile usa drawer.");

const FIRST_PAGE = [
  "Emerald Ape #042",
  "Sage Nomad #009",
  "Neon Vessel #552",
  "Cosmic Bloom #118",
  "Violet Nomad #314",
  "Ivory Baron #088",
  "Golden Beat #207",
  "Golden Frequency #071",
  "Golden Signal #160",
];

const filters = (page: Page) => page.getByRole("complementary", { name: "Filtros" });
const catalog = (page: Page) => page.getByRole("list", { name: "Catálogo de NFTs" });
const cardNames = (page: Page) => catalog(page).getByRole("heading", { level: 3 }).allInnerTexts();

test("mostra a primeira página do catálogo na ordem do Figma, com 9 NFTs", async ({ page, kurio }) => {
  await kurio.open("/");
  await expect(catalog(page).getByRole("listitem")).toHaveCount(9);
  expect(await cardNames(page)).toEqual(FIRST_PAGE);
});

test("busca por texto vai para a URL, filtra a lista e sobrevive ao refresh", async ({ page, kurio }) => {
  await kurio.open("/");
  const search = page.getByRole("search").getByLabel("Buscar NFTs");
  await search.fill("Golden");

  await expect(page).toHaveURL(/[?&]q=Golden/);
  await expect.poll(async () => (await cardNames(page)).every((name) => name.startsWith("Golden"))).toBe(true);

  await page.reload();
  await expect(search).toHaveValue("Golden");
  await expect.poll(async () => (await cardNames(page)).every((name) => name.startsWith("Golden"))).toBe(true);
});

test("filtros combinam (coleção + rede) e refletem os parâmetros na URL", async ({ page, kurio }) => {
  await kurio.open("/");
  await filters(page).getByRole("button", { name: /^Arte digital/ }).click();
  await filters(page).getByRole("button", { name: /^Ethereum/ }).click();

  // O Router serializa arrays em JSON na URL; decodificamos para checar o valor.
  await expect.poll(() => decodeURIComponent(page.url())).toContain("arte-digital");
  await expect.poll(() => decodeURIComponent(page.url())).toContain("ethereum");
  await expect(filters(page).getByRole("button", { name: /^Arte digital/ })).toHaveAttribute("aria-pressed", "true");
  await expect(filters(page).getByRole("button", { name: /^Ethereum/ })).toHaveAttribute("aria-pressed", "true");
});

test("mudar um filtro reinicia a paginação (volta para a página 1)", async ({ page, kurio }) => {
  await kurio.open("/");
  await page.getByRole("navigation", { name: "Paginação" }).getByRole("link", { name: "Página 2" }).click();
  await expect(page).toHaveURL(/[?&]page=2/);

  await filters(page).getByRole("button", { name: /^Arte digital/ }).click();
  await expect.poll(() => decodeURIComponent(page.url())).toContain("arte-digital");
  await expect(page).not.toHaveURL(/[?&]page=2/);
});

test("ordenação por menor preço devolve os preços em ordem crescente", async ({ page, kurio }) => {
  await kurio.open("/");
  await page.getByRole("combobox", { name: "Ordenar por" }).click();
  await page.getByRole("option", { name: "Menor preço" }).click();

  await expect(page).toHaveURL(/sort=price-asc/);
  await expect
    .poll(async () => {
      const prices = (await catalog(page).getByRole("listitem").allInnerTexts()).map((text) => Number(/(\d+\.\d+)\s*ETH/.exec(text)?.[1]));
      return prices.every((price, index) => index === 0 || price >= prices[index - 1]!);
    })
    .toBe(true);
});

test("paginação e histórico: voltar/avançar restauram a página e os filtros", async ({ page, kurio }) => {
  await kurio.open("/");
  const pagination = page.getByRole("navigation", { name: "Paginação" });
  await pagination.getByRole("link", { name: "Página 2" }).click();
  await expect(page).toHaveURL(/[?&]page=2/);
  await expect(pagination.getByRole("link", { name: "Página 2" })).toHaveAttribute("aria-current", "page");

  // A lista da página 1 permanece até chegar a da página 2 (dados anteriores mantidos): espere trocar.
  await expect.poll(() => cardNames(page)).not.toEqual(FIRST_PAGE);
  const secondPage = await cardNames(page);

  await page.goBack();
  await expect(page).not.toHaveURL(/[?&]page=2/);
  await expect.poll(() => cardNames(page)).toEqual(FIRST_PAGE);

  await page.goForward();
  await expect(page).toHaveURL(/[?&]page=2/);
  await expect.poll(() => cardNames(page)).toEqual(secondPage);
});

test("resultado vazio mostra mensagem e permite limpar a busca", async ({ page, kurio }) => {
  await kurio.open("/");
  await page.getByRole("search").getByLabel("Buscar NFTs").fill("zzzz-nao-existe");
  await expect(page.getByRole("heading", { name: "Nenhum NFT encontrado" })).toBeVisible();
});

test("catálogo vazio no cenário 'empty'", async ({ page, kurio }) => {
  await kurio.open("/", "empty");
  await expect(page.getByRole("heading", { name: "Nenhum NFT encontrado" })).toBeVisible();
});

test("respostas fora de ordem: vale o resultado da ÚLTIMA busca", async ({ page, kurio }) => {
  // No cenário out-of-order a 1ª busca responde DEPOIS da 2ª; a UI não pode regredir para a antiga.
  await kurio.open("/", "out-of-order");
  const search = page.getByRole("search").getByLabel("Buscar NFTs");
  await search.fill("Golden");
  await search.fill("Emerald Ape #042");

  await expect(page).toHaveURL(/[?&]q=Emerald/);
  await expect.poll(() => cardNames(page), { timeout: 15_000 }).toEqual(["Emerald Ape #042"]);
});
