import type { Page } from "@playwright/test";
import { connectWallet, expect, test } from "../fixtures";

/**
 * Regressão visual (README §9): Início, Detalhe, Carrinho e Pagamento em desktop e mobile.
 * Dados estáveis: cenário `figma` (carrinho da Ana igual ao Figma: 26.83 / 0.016 / 26.846),
 * relógio fixo, animações desligadas, fontes e imagens carregadas, painel do mock mascarado.
 *
 * ⚠ As baselines dependem do SO (renderização de fonte/antialiasing). Gere e versione SOMENTE as
 * de Linux (CI/Docker): `npm run e2e:update` no runner Linux. Baselines de Windows/macOS são
 * ignoradas (e2e/.gitignore). Ver docs/TESTING.md.
 */
test.use({ colorScheme: "dark" });

const FROZEN_TIME = new Date("2026-07-29T12:00:00.000Z");

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    // As imagens abaixo da dobra são `loading="lazy"`: percorre a página (um quadro por tela)
    // para dispará-las e volta ao topo antes de capturar.
    const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight) {
      window.scrollTo(0, y);
      await nextFrame();
    }
    window.scrollTo(0, 0);
  });
  // Só conta imagens renderizadas: variantes ocultas por CSS (só-mobile/só-desktop) nunca carregam.
  await page.waitForFunction(() =>
    [...document.images].filter((image) => image.getClientRects().length > 0).every((image) => image.complete),
  );
}

const mockChrome = (page: Page) => [page.getByRole("button", { name: /abrir painel de cenários/ })];

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: FROZEN_TIME });
});

test("Início", async ({ page, kurio }) => {
  await kurio.open("/", "figma");
  await expect(page.getByRole("list", { name: "Catálogo de NFTs" })).toBeVisible();
  await settle(page);
  await expect(page).toHaveScreenshot("inicio.png", { fullPage: true, mask: mockChrome(page) });
});

test("Detalhe do NFT", async ({ page, kurio }) => {
  await kurio.open("/nft/emerald-ape-042", "figma");
  await expect(page.getByRole("heading", { level: 1, name: "Emerald Ape #042" })).toBeVisible();
  await settle(page);
  await expect(page).toHaveScreenshot("detalhe.png", { fullPage: true, mask: mockChrome(page) });
});

test("Carrinho", async ({ page, loginAs }) => {
  await loginAs("ana", { redirect: "/carrinho", scenario: "figma" });
  await expect(page.getByText("Emerald Ape #042").first()).toBeVisible();
  await expect(page.getByText("26.846").first()).toBeVisible();
  await settle(page);
  await expect(page).toHaveScreenshot("carrinho.png", { fullPage: true, mask: mockChrome(page) });
});

test("Pagamento", async ({ page, loginAs, isMobile }) => {
  await loginAs("ana", { redirect: "/pagamento", scenario: "figma" });
  await expect(page.getByRole("heading", { name: /Perfil do colecionador|Pagamento/ }).first()).toBeVisible();
  if (isMobile) {
    // O mobile é em etapas: o frame de pagamento corresponde à etapa "Carteira e rede".
    await connectWallet(page, true);
  }
  await settle(page);
  await expect(page).toHaveScreenshot("pagamento.png", { fullPage: true, mask: mockChrome(page) });
});

