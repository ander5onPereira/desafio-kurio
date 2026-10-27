import { buyFromDetail, cartItems, expect, test, TEST_COUPONS } from "../fixtures";

/**
 * Grupo 5 do README — carrinho: quantidades, remoção, cupom (válido, inválido, expirado),
 * persistência após refresh e preservação dos itens do visitante ao autenticar.
 * Usa contas novas: o carrinho começa vazio e determinístico.
 */

test("visitante monta o carrinho, e ele persiste após o refresh", async ({ page, kurio, isMobile }) => {
  await kurio.open("/");
  await kurio.afterResponse("POST", "/cart/items", () => buyFromDetail(page, "emerald-ape-042", isMobile));
  await expect(page.getByRole("link", { name: "Conectar e finalizar" })).toBeVisible();

  await page.reload();
  await expect(page.getByText("Emerald Ape #042").first()).toBeVisible();
});

test("altera a quantidade e o resumo acompanha (valores vindos da cotação)", async ({ page, kurio, isMobile }) => {
  await kurio.open("/");
  await buyFromDetail(page, "emerald-ape-042", isMobile);

  // Total do resumo: o <dd> logo após o <dt> "Total" (valor vindo da cotação).
  const total = page.locator("dt", { hasText: /^Total$/ }).locator("xpath=following-sibling::dd[1]");
  await expect(total).toContainText("ETH");
  const before = await total.innerText();

  await page.getByRole("button", { name: /^Aumentar quantidade de Emerald Ape #042/ }).first().click();
  await expect.poll(async () => total.innerText()).not.toBe(before);
});

test("remove o item e mostra o carrinho vazio", async ({ page, kurio, isMobile }) => {
  await kurio.open("/");
  await buyFromDetail(page, "emerald-ape-042", isMobile);

  await page.getByRole("button", { name: "Remover Emerald Ape #042 do carrinho" }).first().click();
  await expect(page.getByRole("heading", { name: "Seu carrinho está vazio" })).toBeVisible();
});

test.describe("cupom", () => {
  test("cupom válido aplica desconto e pode ser removido", async ({ page, kurio, isMobile }) => {
    await kurio.open("/");
    await buyFromDetail(page, "emerald-ape-042", isMobile);

    await page.getByLabel("Código promocional").fill(TEST_COUPONS.valid);
    await page.getByRole("button", { name: "Aplicar" }).click();
    await expect(page.locator("#conteudo").getByText(`Cupom ${TEST_COUPONS.valid} aplicado`)).toBeVisible();

    await page.getByRole("button", { name: `Remover cupom ${TEST_COUPONS.valid}` }).click();
    await expect(page.getByLabel("Código promocional")).toBeVisible();
  });

  test("cupom inválido e cupom expirado mostram erro no campo", async ({ page, kurio, isMobile }) => {
    await kurio.open("/");
    await buyFromDetail(page, "emerald-ape-042", isMobile);

    const field = page.getByLabel("Código promocional");
    await field.fill(TEST_COUPONS.invalid);
    await page.getByRole("button", { name: "Aplicar" }).click();
    await expect(field).toHaveAttribute("aria-invalid", "true");

    await field.fill(TEST_COUPONS.expired);
    await page.getByRole("button", { name: "Aplicar" }).click();
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#conteudo").getByText(`Cupom ${TEST_COUPONS.expired} aplicado`)).toHaveCount(0);
  });
});

test("itens do visitante são preservados ao fazer login", async ({ page, kurio, loginAs, createAccount, isMobile }) => {
  await kurio.open("/");
  const account = await createAccount();
  await kurio.afterResponse("POST", "/cart/items", () => buyFromDetail(page, "emerald-ape-042", isMobile));

  await loginAs(account, { redirect: "/carrinho" });
  await expect(page.getByText("Emerald Ape #042").first()).toBeVisible();
  // Resultado no servidor: o item agora está no carrinho do USUÁRIO.
  await expect.poll(async () => (await cartItems(kurio)).map((item) => item.nftId)).toContain("emerald-ape-042");

  await page.reload();
  await expect(page.getByText("Emerald Ape #042").first()).toBeVisible();
});

test("carrinho do usuário persiste após o refresh e não vaza para outro usuário", async ({ page, kurio, loginAs, logout, createAccount, isMobile }) => {
  await kurio.open("/");
  const first = await createAccount();
  await loginAs(first, { redirect: "/" });
  await kurio.afterResponse("POST", "/cart/items", () => buyFromDetail(page, "emerald-ape-042", isMobile));
  await page.reload();
  await expect(page.getByText("Emerald Ape #042").first()).toBeVisible();

  await logout();
  const second = await createAccount();
  await loginAs(second, { redirect: "/carrinho" });
  await expect(page.getByRole("heading", { name: "Seu carrinho está vazio" })).toBeVisible();
});
