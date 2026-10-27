import { expect, test as base, type Page } from "@playwright/test";
import { TEST_USERS, type ScenarioId } from "../../src/contracts";
import { KurioClient } from "./kurio";

export type TestUser = keyof typeof TEST_USERS;

export interface Credentials {
  email: string;
  password: string;
  username: string;
}

interface LoginOptions {
  /** Rota de retorno após o login (padrão "/"). */
  redirect?: string;
  scenario?: ScenarioId;
}

interface Fixtures {
  /** Control plane do servidor simulado (cenários, injeção de falhas, eventos de socket). */
  kurio: KurioClient;
  /** Login pela UI (fluxo real) com um usuário fictício do seed ou com credenciais próprias. */
  loginAs: (user: TestUser | Credentials, options?: LoginOptions) => Promise<Credentials>;
  /** Encerra a sessão pela UI (menu da conta no desktop; "Sair" do perfil no mobile). */
  logout: () => Promise<void>;
  /**
   * Cria uma conta NOVA direto na API do mock (sem sessão no app): sem carteiras, favoritos nem
   * pedidos — ideal para estados vazios e para não depender de dados do seed. Pede a página aberta.
   */
  createAccount: () => Promise<Credentials>;
}

let accountCounter = 0;

/**
 * `test` com as fixtures do Kurio. Cada teste recebe um contexto de navegador novo — logo,
 * localStorage vazio e banco do mock no seed. `kurio.reset()` volta ao seed no meio do teste.
 */
export const test = base.extend<Fixtures>({
  kurio: async ({ page }, provide) => {
    await provide(new KurioClient(page));
  },

  createAccount: async ({ page, kurio }, provide) => {
    await provide(async () => {
      if (!page.url().startsWith("http")) await kurio.open("/");
      accountCounter += 1;
      const suffix = `${Date.now().toString(36)}${accountCounter}`;
      const credentials: Credentials = {
        username: `colecionador.${suffix}`.slice(0, 24),
        email: `colecionador.${suffix}@kurio.test`,
        password: "Kurio@2026",
      };
      const status = await page.evaluate(async (body) => {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        return response.status;
      }, credentials);
      expect(status, "cadastro direto na API do mock").toBe(201);
      // O servidor simulado grava o banco no localStorage com debounce: espere a conta estar
      // persistida antes de qualquer recarga de página (determinístico, sem tempo fixo).
      await page.waitForFunction(
        (email) => localStorage.getItem("kurio.mockdb.v1")?.includes(email) ?? false,
        credentials.email,
      );
      return credentials;
    });
  },

  logout: async ({ page }, provide) => {
    await provide(async () => {
      const accountMenu = page.getByRole("button", { name: /^Menu da conta de/ });
      if (await accountMenu.isVisible()) {
        await accountMenu.click();
        await page.getByRole("menuitem", { name: "Sair" }).click();
        // Sessão encerrada: o menu da conta some (a rota pode continuar pública).
        await expect(accountMenu).toHaveCount(0);
      } else {
        // Mobile: não há menu no topo; o "Sair" fica em Meu perfil.
        await page.goto("/perfil");
        await page.getByRole("button", { name: "Sair" }).click();
        await expect(page).toHaveURL((url) => url.pathname === "/");
      }
    });
  },

  loginAs: async ({ page, kurio }, provide) => {
    await provide(async (user, options = {}) => {
      const credentials: Credentials =
        typeof user === "string" ? { ...TEST_USERS[user] } : user;
      const target = options.redirect ?? "/";
      await kurio.open(`/login?redirect=${encodeURIComponent(target)}`, options.scenario);
      const form = page.getByRole("form", { name: "Entrar" });
      await form.getByLabel("E-mail").fill(credentials.email);
      // O rótulo pode ter asterisco ("Senha*"), por isso regex em vez de texto exato.
      await form.getByLabel(/^Senha/).fill(credentials.password);
      await form.getByRole("button", { name: "Entrar", exact: true }).click();
      await expect(page).toHaveURL((url) => url.pathname === target.split("?")[0], { timeout: 15_000 });
      return credentials;
    });
  },
});

export { expect };
export type { Page };
export { TEST_USERS, TEST_COUPONS, TEST_REFERRAL_CODE } from "../../src/contracts";
export * from "./checks";
export * from "./flows";
