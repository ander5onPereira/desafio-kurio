import type { Page } from "@playwright/test";
import { expect, test, TEST_USERS } from "../fixtures";

/**
 * Seleção e reset de cenários do servidor simulado (README → Cenários): pela URL e pelo painel "Mock · …".
 * O botão do painel fica aria-hidden quando o app abre um modal (login/cadastro), então é localizado pelo DOM.
 */
const toggle = (page: Page) => page.locator("#kurio-mock-panel button[aria-expanded]");
const backToDefault = (page: Page) =>
  page.locator("#kurio-mock-panel").getByRole("button", { name: "Restaurar default", includeHidden: true });

test("o painel aplica o cenário escolhido mesmo que a URL tenha ?scenario=", async ({ page, kurio }) => {
  await kurio.open("/", "wallet-rejected");
  await expect(toggle(page)).toContainText("wallet-rejected");
  await expect(page).toHaveURL((url) => !url.searchParams.has("scenario"));

  await toggle(page).click();
  await page.locator("#kurio-scenario").selectOption("empty");
  await expect(page.locator("p", { hasText: "Como ver:" })).toContainText("Nenhum NFT encontrado");
  await page.getByRole("button", { name: "Aplicar e resetar" }).click();

  // O parâmetro da URL não pode desfazer a escolha, e o efeito aparece na tela.
  await expect(toggle(page)).toContainText("empty");
  await expect(page.getByRole("dialog", { name: "Servidor simulado" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Cenário aplicado" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Nenhum NFT encontrado" })).toBeVisible();

  await page.reload();
  await expect(toggle(page)).toContainText("empty");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("?scenario= e ?reset= valem uma vez: saem da URL e os outros parâmetros ficam", async ({ page, kurio }) => {
  await kurio.open("/?reset=1&q=Golden%20Frequency", "default");

  await expect(toggle(page)).toContainText("default");
  await expect(page).toHaveURL((url) => url.searchParams.get("q") === "Golden Frequency" && !url.searchParams.has("scenario") && !url.searchParams.has("reset"));
});

test("'Aplicar e abrir a tela de teste' aplica o cenário e abre a tela onde ele aparece", async ({ page, kurio }) => {
  await kurio.open("/");
  await toggle(page).click();
  await page.locator("#kurio-scenario").selectOption("register-conflict");
  await expect(page.locator("p", { hasText: "Como ver:" })).toContainText("409");
  await page.getByRole("button", { name: "Aplicar e abrir a tela de teste" }).click();

  await expect(page).toHaveURL((url) => url.pathname === "/cadastro");
  await expect(toggle(page)).toContainText("register-conflict");

  const form = page.getByRole("form", { name: "Criar conta" });
  await form.getByLabel("Nome de usuário").fill("quem.quer");
  await form.getByLabel("E-mail").fill("qualquer@kurio.test");
  await form.getByLabel(/^Senha/).first().fill("Kurio@2026");
  await form.getByLabel("Confirmar senha").fill("Kurio@2026");
  await form.getByRole("button", { name: "Criar conta" }).click();
  await expect(form.getByLabel("E-mail")).toHaveAttribute("aria-invalid", "true");
});

test("cenário de falha ativo: o atalho 'Restaurar default' recupera o login, mesmo com o modal aberto", async ({ page, kurio }) => {
  // default e figma não simulam falha: sem atalho (e o figma é o cenário das capturas visuais).
  await kurio.open("/");
  await expect(backToDefault(page)).toHaveCount(0);
  await kurio.open("/", "figma");
  await expect(backToDefault(page)).toHaveCount(0);

  // Em `offline` o login falha com "verifique sua internet" (o app não sabe que é simulado)...
  await kurio.open("/login?redirect=%2Fperfil", "offline");
  const { email, password } = TEST_USERS.ana;
  const signIn = async () => {
    const form = page.getByRole("form", { name: "Entrar" });
    await form.getByLabel("E-mail").fill(email);
    await form.getByLabel(/^Senha/).fill(password);
    await form.getByRole("button", { name: "Entrar", exact: true }).click();
  };
  await signIn();
  await expect(page.getByRole("alert").filter({ hasText: "Sem conexão com o servidor" })).toBeVisible();

  // ...e o modal deixa o app inerte, inclusive o painel. O atalho precisa continuar clicável.
  await backToDefault(page).click();
  await expect(toggle(page)).toContainText("default");
  await expect(backToDefault(page)).toHaveCount(0);

  await signIn();
  await expect(page).toHaveURL((url) => url.pathname === "/perfil");
  await expect(page.getByRole("heading", { level: 1, name: "Perfil do colecionador" })).toBeVisible();
});
