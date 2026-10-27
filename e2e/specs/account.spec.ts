import type { Locator, Page } from "@playwright/test";
import { expect, expectNoHorizontalOverflow, test, TEST_REFERRAL_CODE } from "../fixtures";

/**
 * Grupo 8 do README — Perfil, avatar, senha e carteiras, com erros de validação.
 * Usa contas NOVAS (createAccount): estados vazios e nenhuma dependência de dados do seed.
 */

// PNG 1×1 transparente (o app reduz/valida no navegador antes de enviar).
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

/** Conta nova começa sem ENS e sem apelido de carteira (obrigatórios no Figma): preenche para poder salvar. */
async function fillRequiredProfile(page: Page) {
  await page.getByLabel("Apelido da carteira").fill("Principal");
  await page.getByLabel(/^Nome ENS/).fill("colecionador");
}

test.describe("Perfil do colecionador", () => {
  test("edita os dados e eles permanecem após o refresh", async ({ page, loginAs, createAccount, kurio }) => {
    await kurio.open("/");
    const account = await createAccount();
    await loginAs(account, { redirect: "/perfil" });

    await expect(page.getByRole("heading", { name: "Perfil do colecionador" })).toBeVisible();
    await page.getByLabel("Nome de exibição").fill("Nova Colecionadora");
    await page.getByLabel("Apelido da carteira").fill("Cofre");
    await page.getByLabel(/^Nome ENS/).fill("nova-colecionadora");
    await page.getByRole("button", { name: "Salvar" }).click();

    await expect(page.getByText("Perfil atualizado.")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Nome de exibição")).toHaveValue("Nova Colecionadora");
    await expect(page.getByLabel("Apelido da carteira")).toHaveValue("Cofre");
    await expect(page.getByLabel(/^Nome ENS/)).toHaveValue("nova-colecionadora");
  });

  test("valida os campos obrigatórios e associa a mensagem ao campo", async ({ page, loginAs, createAccount, kurio }) => {
    await kurio.open("/");
    const account = await createAccount();
    await loginAs(account, { redirect: "/perfil" });

    const name = page.getByLabel("Nome de exibição");
    await name.fill("");
    await page.getByLabel("E-mail").fill("isso-nao-e-email");
    await page.getByRole("button", { name: "Salvar" }).click();

    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("E-mail")).toHaveAttribute("aria-invalid", "true");
    // O erro está ligado ao campo por aria-describedby (leitor de tela anuncia junto do campo).
    const describedBy = await name.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    await expect(page.locator(`[id="${describedBy}"]`)).toContainText("nome de exibição");
  });

  test("mostra o erro de conflito retornado pela API no campo certo", async ({ page, loginAs, createAccount, kurio }) => {
    await kurio.open("/");
    const account = await createAccount();
    await loginAs(account, { redirect: "/perfil" });

    // Nome de usuário do seed já existe → 409 USERNAME_TAKEN com fieldErrors.username.
    await fillRequiredProfile(page);
    await page.getByLabel("Nome de usuário").fill("ana.nova");
    await page.getByRole("button", { name: "Salvar" }).click();

    const username = page.getByLabel("Nome de usuário");
    await expect(username).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Perfil atualizado.")).toHaveCount(0);
  });

  test("troca e remove o avatar, e o avatar persiste após o refresh", async ({ page, loginAs, createAccount, kurio }) => {
    await kurio.open("/");
    const account = await createAccount();
    await loginAs(account, { redirect: "/perfil" });

    const avatar = page.locator("main img[alt^='Avatar']");
    await expect(avatar).toHaveCount(0);

    await page.getByLabel("Selecionar imagem do avatar").setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: PNG_1X1 });
    await expect(page.getByText("Avatar atualizado.")).toBeVisible();
    await expect(avatar).toBeVisible();

    await page.reload();
    await expect(avatar).toBeVisible();

    await page.getByRole("button", { name: "Remover" }).click();
    await expect(page.getByText("Avatar removido.")).toBeVisible();
    await expect(avatar).toHaveCount(0);
  });

  test("recusa arquivo que não é imagem suportada", async ({ page, loginAs, createAccount, kurio }) => {
    await kurio.open("/");
    const account = await createAccount();
    await loginAs(account, { redirect: "/perfil" });

    await page.getByLabel("Selecionar imagem do avatar").setInputFiles({ name: "nota.txt", mimeType: "text/plain", buffer: Buffer.from("oi") });
    await expect(page.getByRole("alert").filter({ hasText: "Formato não suportado" })).toBeVisible();
  });

  test("altera a senha: valida confirmação, recusa senha atual errada e aceita a correta", async ({ page, loginAs, createAccount, kurio }) => {
    await kurio.open("/");
    const account = await createAccount();
    await loginAs(account, { redirect: "/perfil" });

    await fillRequiredProfile(page);
    // 1) Confirmação diferente (validação no cliente).
    await page.getByLabel("Senha atual").fill(account.password);
    await page.getByLabel(/^Nova senha/).fill("NovaSenha@2027");
    await page.getByLabel(/^Confirmar nova senha/).fill("OutraCoisa@2027");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByLabel(/^Confirmar nova senha/)).toHaveAttribute("aria-invalid", "true");

    // 2) Senha atual errada (erro da API no campo da senha atual).
    await page.getByLabel(/^Confirmar nova senha/).fill("NovaSenha@2027");
    await page.getByLabel("Senha atual").fill("senha-errada-1");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByLabel("Senha atual")).toHaveAttribute("aria-invalid", "true");

    // 3) Correta.
    await page.getByLabel("Senha atual").fill(account.password);
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Perfil e senha atualizados.")).toBeVisible();

    // A nova senha vale no próximo login (resultado real da operação no servidor simulado).
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/"); // logout concluído (sessão limpa)
    await loginAs({ ...account, password: "NovaSenha@2027" }, { redirect: "/perfil" });
    await expect(page.getByRole("heading", { name: "Perfil do colecionador" })).toBeVisible();
  });
});

test.describe("Carteiras", () => {
  test("mostra o estado vazio da secundária e valida o formulário da principal", async ({ page, loginAs, createAccount, kurio }) => {
    await kurio.open("/");
    const account = await createAccount();
    await loginAs(account, { redirect: "/perfil/carteiras" });

    await expect(page.getByText("Você ainda não adicionou uma carteira secundária.")).toBeVisible();

    const primary = page.getByRole("form", { name: "Carteira principal" });
    await primary.getByLabel("Apelido da carteira").fill("");
    await primary.getByRole("button", { name: "Salvar carteira" }).click();

    await expect(primary.getByLabel(/^Rede/)).toHaveAttribute("aria-invalid", "true");
    await expect(primary.getByLabel("Endereço da carteira")).toHaveAttribute("aria-invalid", "true");
    await expect(primary.getByLabel("Tipo de carteira")).toHaveAttribute("aria-invalid", "true");
  });

  test("valida o endereço conforme a rede escolhida", async ({ page, loginAs, createAccount, kurio }) => {
    await kurio.open("/");
    const account = await createAccount();
    await loginAs(account, { redirect: "/perfil/carteiras" });

    const primary = page.getByRole("form", { name: "Carteira principal" });
    await primary.getByLabel(/^Rede/).selectOption("ethereum");
    await primary.getByLabel("Endereço da carteira").fill("0x123");
    await primary.getByLabel("Tipo de carteira").selectOption("metamask");
    await primary.getByRole("button", { name: "Salvar carteira" }).click();

    await expect(primary.getByLabel("Endereço da carteira")).toHaveAttribute("aria-invalid", "true");
    await expect(primary.getByText("Endereço inválido para a rede selecionada")).toBeVisible();
  });

  test("recusa código de indicação inexistente (erro da API no campo)", async ({ page, loginAs, createAccount, kurio }) => {
    await kurio.open("/");
    const account = await createAccount();
    await loginAs(account, { redirect: "/perfil/carteiras" });

    const primary = page.getByRole("form", { name: "Carteira principal" });
    await fillWallet(primary, { referralCode: "CODIGO-INEXISTENTE" });
    await primary.getByRole("button", { name: "Salvar carteira" }).click();

    await expect(primary.getByLabel("Código de indicação")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Carteira cadastrada.")).toHaveCount(0);
  });

  test("cadastra a principal e a secundária, e ambas persistem após o refresh", async ({ page, loginAs, createAccount, kurio }) => {
    await kurio.open("/");
    const account = await createAccount();
    await loginAs(account, { redirect: "/perfil/carteiras" });

    const primary = page.getByRole("form", { name: "Carteira principal" });
    await fillWallet(primary, { nickname: "Principal", referralCode: TEST_REFERRAL_CODE });
    await primary.getByRole("button", { name: "Salvar carteira" }).click();
    await expect(page.getByText("Carteira cadastrada.")).toBeVisible();

    // Secundária (Polygon) — "Adicionar" revela o formulário.
    await page.getByRole("button", { name: "Adicionar" }).click();
    const secondary = page.getByRole("form", { name: "Carteira secundária" });
    await fillWallet(secondary, {
      nickname: "Reserva",
      network: "polygon",
      address: "0x2222222222222222222222222222222222222222",
      referralCode: TEST_REFERRAL_CODE,
    });
    await kurio.afterResponse("POST", "/wallets", () => secondary.getByRole("button", { name: "Salvar carteira" }).click());

    await page.reload();
    await expect(page.getByRole("form", { name: "Carteira principal" }).getByLabel("Apelido da carteira")).toHaveValue("Principal");
    await expect(page.getByRole("form", { name: "Carteira secundária" }).getByLabel("Apelido da carteira")).toHaveValue("Reserva");
    await expect(page.getByRole("form", { name: "Carteira secundária" }).getByLabel(/^Rede/)).toHaveValue("polygon");
  });

  test("edita o apelido da principal", async ({ page, loginAs, createAccount, kurio }) => {
    await kurio.open("/");
    const account = await createAccount();
    await loginAs(account, { redirect: "/perfil/carteiras" });

    const primary = page.getByRole("form", { name: "Carteira principal" });
    await fillWallet(primary, { nickname: "Principal", referralCode: TEST_REFERRAL_CODE });
    await primary.getByRole("button", { name: "Salvar carteira" }).click();
    await expect(page.getByText("Carteira cadastrada.")).toBeVisible();

    await primary.getByLabel("Apelido da carteira").fill("Cofre frio");
    await primary.getByRole("button", { name: "Salvar carteira" }).click();
    await expect(page.getByText("Carteira atualizada.")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("form", { name: "Carteira principal" }).getByLabel("Apelido da carteira")).toHaveValue("Cofre frio");
  });

  test("'Igual à carteira principal' copia os dados e trava os campos", async ({ page, loginAs, createAccount, kurio }) => {
    await kurio.open("/");
    const account = await createAccount();
    await loginAs(account, { redirect: "/perfil/carteiras" });

    const primary = page.getByRole("form", { name: "Carteira principal" });
    await fillWallet(primary, { nickname: "Principal", referralCode: TEST_REFERRAL_CODE });
    await primary.getByRole("button", { name: "Salvar carteira" }).click();
    await expect(page.getByText("Carteira cadastrada.")).toBeVisible();

    await page.getByRole("checkbox", { name: "Igual à carteira principal" }).click();
    const secondary = page.getByRole("form", { name: "Carteira secundária" });
    await expect(secondary.getByLabel("Endereço da carteira")).toHaveValue("0x1111111111111111111111111111111111111111");
    await expect(secondary.getByLabel("Endereço da carteira")).toBeDisabled();
  });

  test("não tem overflow horizontal no mobile e no tablet", async ({ page, loginAs, createAccount, kurio }) => {
    await kurio.open("/");
    const account = await createAccount();
    await loginAs(account, { redirect: "/perfil/carteiras" });
    await expectNoHorizontalOverflow(page);
    await page.goto("/perfil");
    await expectNoHorizontalOverflow(page);
  });
});

/** Preenche o formulário de carteira com valores válidos (sobrescreva só o que o teste precisa). */
async function fillWallet(
  form: Locator,
  overrides: Partial<{ nickname: string; network: string; address: string; referralCode: string }> = {},
) {
  const values = {
    nickname: "Principal",
    network: "ethereum",
    address: "0x1111111111111111111111111111111111111111",
    referralCode: TEST_REFERRAL_CODE,
    ...overrides,
  };
  await form.getByLabel("Nome de exibição").fill("Colecionador Teste");
  await form.getByLabel("Apelido da carteira").fill(values.nickname);
  await form.getByLabel(/^Rede/).selectOption(values.network);
  await form.getByLabel("Nome do perfil").fill("colecionador-teste");
  await form.getByLabel("Endereço da carteira").fill(values.address);
  await form.getByLabel("Tipo de carteira").selectOption("metamask");
  await form.getByLabel("Código de indicação").fill(values.referralCode);
  await form.getByLabel("E-mail").fill("colecionador@kurio.test");
  await form.getByLabel(/^Nome ENS/).fill("colecionador");
}
