import { expect, test, TEST_USERS } from "../fixtures";

/**
 * Grupo 3 do README — cadastro, login, expiração de sessão, logout e troca de usuário.
 * Inclui o requisito eliminatório: nenhum dado privado vaza entre usuários.
 */

test.describe("Cadastro", () => {
  test("cria a conta, entra na sessão e volta ao fluxo", async ({ page, kurio }) => {
    await kurio.open("/cadastro");
    const form = page.getByRole("form", { name: "Criar conta" });
    await form.getByLabel("Nome de usuário").fill("nova.pessoa");
    await form.getByLabel("E-mail").fill("nova.pessoa@kurio.test");
    await form.getByLabel(/^Senha/).first().fill("Kurio@2026");
    await form.getByLabel("Confirmar senha").fill("Kurio@2026");
    await form.getByRole("button", { name: "Criar conta" }).click();

    await expect(page).toHaveURL((url) => url.pathname === "/");
    await expect(page.getByRole("link", { name: "Entrar", exact: true })).toHaveCount(0);
  });

  test("valida os campos (senha curta, confirmação diferente)", async ({ page, kurio }) => {
    await kurio.open("/cadastro");
    const form = page.getByRole("form", { name: "Criar conta" });
    await form.getByLabel("Nome de usuário").fill("nova.pessoa");
    await form.getByLabel("E-mail").fill("nova.pessoa@kurio.test");
    await form.getByLabel(/^Senha/).first().fill("curta");
    await form.getByLabel("Confirmar senha").fill("diferente");
    await form.getByRole("button", { name: "Criar conta" }).click();

    await expect(form.getByLabel(/^Senha/).first()).toHaveAttribute("aria-invalid", "true");
    await expect(form.getByLabel("Confirmar senha")).toHaveAttribute("aria-invalid", "true");
  });

  test("trata conflito: e-mail já cadastrado vira erro no campo", async ({ page, kurio }) => {
    await kurio.open("/cadastro");
    const form = page.getByRole("form", { name: "Criar conta" });
    await form.getByLabel("Nome de usuário").fill("outro.usuario");
    await form.getByLabel("E-mail").fill(TEST_USERS.ana.email);
    await form.getByLabel(/^Senha/).first().fill("Kurio@2026");
    await form.getByLabel("Confirmar senha").fill("Kurio@2026");
    await form.getByRole("button", { name: "Criar conta" }).click();

    await expect(form.getByLabel("E-mail")).toHaveAttribute("aria-invalid", "true");
    await expect(page).toHaveURL(/\/cadastro/);
  });
});

test.describe("Login e rotas privadas", () => {
  test("rota privada redireciona ao login e retorna ao fluxo depois de autenticar", async ({ page, kurio }) => {
    await kurio.open("/perfil/carteiras");
    await expect(page).toHaveURL(/\/login\?.*redirect=/);

    const form = page.getByRole("form", { name: "Entrar" });
    await form.getByLabel("E-mail").fill(TEST_USERS.ana.email);
    await form.getByLabel(/^Senha/).fill(TEST_USERS.ana.password);
    await form.getByRole("button", { name: "Entrar", exact: true }).click();

    await expect(page).toHaveURL((url) => url.pathname === "/perfil/carteiras");
  });

  test("credenciais inválidas mostram erro e não autenticam", async ({ page, kurio }) => {
    await kurio.open("/login");
    const form = page.getByRole("form", { name: "Entrar" });
    await form.getByLabel("E-mail").fill(TEST_USERS.ana.email);
    await form.getByLabel(/^Senha/).fill("senha-errada-1");
    await form.getByRole("button", { name: "Entrar", exact: true }).click();

    await expect(page.getByRole("alert").first()).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("a sessão é recuperada após o refresh", async ({ page, loginAs }) => {
    await loginAs("ana", { redirect: "/perfil" });
    await page.reload();
    await expect(page).toHaveURL((url) => url.pathname === "/perfil");
    await expect(page.getByLabel("Nome de exibição")).toHaveValue("Ana Nova");
  });
});

test.describe("Sessão expirada, logout e troca de usuário", () => {
  test("sessão expirada leva ao login preservando a rota e retoma depois", async ({ page, kurio, loginAs }) => {
    await loginAs("ana", { redirect: "/perfil" });

    // O servidor passa a recusar o refresh e o relógio dele avança além da validade do token (sem
    // apagar os dados do mock). O relógio vive na página: a expiração é exercida navegando no
    // cliente, sem recarregar, com a sessão do navegador agora vencida.
    await kurio.setScenario("session-expired", { keepData: true });
    await kurio.setServerClock(new Date(Date.now() + 24 * 3_600_000).toISOString());
    // O preload ao passar o mouse pode redirecionar antes do clique: os dois caminhos são válidos.
    await page.getByRole("link", { name: "Carteiras" }).click({ timeout: 5_000 }).catch(() => undefined);

    await expect(page).toHaveURL(/\/login\?.*redirect=/);
    await kurio.setScenario("default", { keepData: true });
    await kurio.resetServerClock();

    await page.getByLabel("E-mail").fill(TEST_USERS.ana.email);
    await page.getByLabel(/^Senha/).fill(TEST_USERS.ana.password);
    await page.getByRole("form", { name: "Entrar" }).getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname.startsWith("/perfil"));
  });

  test("logout encerra a sessão e bloqueia as rotas privadas", async ({ page, loginAs }) => {
    await loginAs("ana", { redirect: "/perfil" });
    await page.getByRole("button", { name: "Sair" }).click();

    await expect(page).toHaveURL((url) => url.pathname === "/");
    await page.goto("/perfil");
    await expect(page).toHaveURL(/\/login/);
  });

  test("troca de usuário não vaza dados privados da sessão anterior", async ({ page, loginAs }) => {
    await loginAs("ana", { redirect: "/perfil/favoritos" });
    const favorites = page.getByRole("list", { name: "NFTs favoritos" });
    await expect(favorites.getByRole("heading", { level: 3, name: "Emerald Ape #042" })).toBeVisible();

    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/");

    // Bruno: outros favoritos; nada de Ana pode aparecer (nem do cache nem do socket).
    await loginAs("bruno", { redirect: "/perfil/favoritos" });
    await expect(favorites.getByRole("heading", { level: 3, name: "Sage Nomad #009" })).toBeVisible();
    await expect(favorites.getByRole("heading", { level: 3, name: "Emerald Ape #042" })).toHaveCount(0);

    await page.goto("/perfil");
    await expect(page.getByLabel("Nome de exibição")).toHaveValue("Bruno Vega");
  });
});
