import { expect, expectNoA11yViolations, test } from "../fixtures";

/**
 * Grupo 11 do README — navegação por teclado, foco de diálogos e validação de formulários,
 * além de uma varredura axe (violações sérias/críticas) nas telas principais.
 */

const PUBLIC_PAGES = [
  { name: "Início", path: "/" },
  { name: "Detalhe do NFT", path: "/nft/emerald-ape-042" },
  { name: "Carrinho", path: "/carrinho" },
];

for (const { name, path } of PUBLIC_PAGES) {
  test(`axe: ${name} não tem violações sérias`, async ({ page, kurio }) => {
    await kurio.open(path);
    await expect(page.getByRole("main")).toBeVisible();
    await expectNoA11yViolations(page);
  });
}

// Login e cadastro abrem como diálogo (desktop) ou tela cheia (mobile): o conteúdo é o formulário.
for (const { name, path, form } of [
  { name: "Login", path: "/login", form: "Entrar" },
  { name: "Cadastro", path: "/cadastro", form: "Criar conta" },
]) {
  test(`axe: ${name} não tem violações sérias`, async ({ page, kurio }) => {
    await kurio.open(path);
    await expect(page.getByRole("form", { name: form })).toBeVisible();
    await expectNoA11yViolations(page);
  });
}

for (const { name, path } of [
  { name: "Perfil", path: "/perfil" },
  { name: "Carteiras", path: "/perfil/carteiras" },
  { name: "Lista de interesse", path: "/perfil/favoritos" },
]) {
  test(`axe (logado): ${name} não tem violações sérias`, async ({ page, loginAs }) => {
    await loginAs("ana", { redirect: path });
    await expect(page.getByRole("main")).toBeVisible();
    await expectNoA11yViolations(page);
  });
}

test("teclado: o primeiro Tab leva ao link 'Ir para o conteúdo' e ele move o foco", async ({ page, kurio, isMobile }) => {
  test.skip(isMobile, "Teclado físico não se aplica ao mobile.");
  await kurio.open("/");
  await expect(page.getByRole("list", { name: "Catálogo de NFTs" })).toBeVisible(); // página montada antes de tabular
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Ir para o conteúdo" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#conteudo")).toBeFocused();
});

test("teclado: todo elemento focado mostra indicador de foco visível", async ({ page, kurio, isMobile }) => {
  test.skip(isMobile, "Teclado físico não se aplica ao mobile.");
  await kurio.open("/");
  await expect(page.getByRole("list", { name: "Catálogo de NFTs" })).toBeVisible(); // página montada antes de tabular
  for (let step = 0; step < 6; step++) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null;
      if (!element || element === document.body) return null;
      const style = getComputedStyle(element);
      return {
        label: `${element.tagName.toLowerCase()} "${(element.getAttribute("aria-label") ?? element.textContent ?? "").trim().slice(0, 30)}"`,
        width: parseFloat(style.outlineWidth),
        style: style.outlineStyle,
      };
    });
    expect(focused, `o Tab nº ${step + 1} deve focar um elemento`).not.toBeNull();
    expect(focused!.style, `indicador de foco em ${focused!.label}`).not.toBe("none");
    expect(focused!.width, `espessura do foco em ${focused!.label}`).toBeGreaterThan(0);
  }
});

test("diálogo de login: foco entra, fica preso, Esc fecha e devolve o foco", async ({ page, kurio, isMobile }) => {
  test.skip(isMobile, "No mobile o login é tela cheia, não diálogo.");
  await kurio.open("/");
  await page.getByRole("link", { name: "Entrar" }).first().click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // O foco está DENTRO do diálogo e continua dentro depois de várias tabulações.
  for (let step = 0; step < 12; step++) {
    await page.keyboard.press("Tab");
    const inside = await page.evaluate(() => Boolean(document.activeElement?.closest("[role='dialog']")));
    expect(inside, "o foco não pode sair do diálogo").toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("validação: erro fica associado ao campo e é anunciado", async ({ page, kurio }) => {
  await kurio.open("/login");
  const form = page.getByRole("form", { name: "Entrar" });
  await form.getByRole("button", { name: "Entrar", exact: true }).click();

  const email = form.getByLabel("E-mail");
  await expect(email).toHaveAttribute("aria-invalid", "true");
  const describedBy = await email.getAttribute("aria-describedby");
  expect(describedBy).toBeTruthy();
  const message = page.locator(`[id="${describedBy}"]`);
  await expect(message).toBeVisible();
  await expect(message).toHaveAttribute("role", "alert");
});

test("movimento reduzido: o shimmer dos skeletons é desligado", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce", baseURL: process.env.E2E_BASE_URL ?? "http://localhost:4173" });
  const page = await context.newPage();
  await page.goto("/?scenario=slow");
  const skeleton = page.locator(".skeleton-shimmer").first();
  await skeleton.waitFor({ state: "attached" });
  const duration = await skeleton.evaluate((element) => getComputedStyle(element).animationDuration);
  // O CSS global reduz as animações a ~0 quando o usuário prefere menos movimento.
  expect(parseFloat(duration)).toBeLessThan(0.05);
  await context.close();
});
