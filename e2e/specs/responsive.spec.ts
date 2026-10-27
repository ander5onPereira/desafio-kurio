import { expect, expectNoHorizontalOverflow, test, VIEWPORTS } from "../fixtures";

/**
 * Responsividade (README §8): sem overflow horizontal em 390, 768 e 1440 nas telas públicas e,
 * logado, nas telas de conta. Roda no projeto "chromium-tablet" e redimensiona a janela.
 */
const PUBLIC_ROUTES = ["/", "/nft/emerald-ape-042", "/carrinho"];
// Login e cadastro abrem como diálogo (desktop) ou tela cheia (mobile): o conteúdo é o formulário.
const AUTH_ROUTES = [
  { path: "/login", form: "Entrar" },
  { path: "/cadastro", form: "Criar conta" },
];
const PRIVATE_ROUTES = ["/perfil", "/perfil/carteiras", "/perfil/favoritos", "/pagamento"];

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} (${viewport.width}px)`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of PUBLIC_ROUTES) {
      test(`${route} não tem overflow horizontal`, async ({ page, kurio }) => {
        await kurio.open(route);
        await expect(page.getByRole("main")).toBeVisible();
        await expectNoHorizontalOverflow(page);
      });
    }

    for (const { path, form } of AUTH_ROUTES) {
      test(`${path} não tem overflow horizontal`, async ({ page, kurio }) => {
        await kurio.open(path);
        await expect(page.getByRole("form", { name: form })).toBeVisible();
        await expectNoHorizontalOverflow(page);
      });
    }

    for (const route of PRIVATE_ROUTES) {
      test(`${route} (logado) não tem overflow horizontal`, async ({ page, loginAs }) => {
        await loginAs("ana", { redirect: route });
        await expect(page.getByRole("main")).toBeVisible();
        await expectNoHorizontalOverflow(page);
      });
    }
  });
}

test("zoom de 200% não perde conteúdo nem gera overflow no início", async ({ page, kurio }) => {
  // 200% de zoom equivale a uma janela de metade da largura (reflow, WCAG 1.4.10).
  await page.setViewportSize({ width: 720, height: 800 });
  await kurio.open("/");
  await expect(page.getByRole("main")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
