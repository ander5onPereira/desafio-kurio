import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures";

/**
 * Grupo 4 do README — favoritos, incluindo falha de mutation (rollback) e recuperação.
 * Favoritos persistem por usuário autenticado; visitante é levado ao login.
 */

const heart = (page: Page, name: string) => page.getByRole("button", { name: `Favoritar ${name}` });

test("visitante que favorita é levado ao login e volta ao catálogo", async ({ page, kurio }) => {
  await kurio.open("/");
  await heart(page, "Sage Nomad #009").click();
  await expect(page).toHaveURL(/\/login\?.*redirect=/);
});

test("favorita, persiste após o refresh e é isolado por usuário", async ({ page, loginAs, logout, createAccount, kurio }) => {
  await kurio.open("/");
  const account = await createAccount();
  await loginAs(account, { redirect: "/" });

  await expect(heart(page, "Sage Nomad #009")).toHaveAttribute("aria-pressed", "false");
  await kurio.afterResponse("PUT", "/favorites", () => heart(page, "Sage Nomad #009").click());
  await expect(heart(page, "Sage Nomad #009")).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(heart(page, "Sage Nomad #009")).toHaveAttribute("aria-pressed", "true");

  // Outra conta nova não vê esse favorito.
  await logout();
  const other = await createAccount();
  await loginAs(other, { redirect: "/" });
  await expect(heart(page, "Sage Nomad #009")).toHaveAttribute("aria-pressed", "false");
});

test("falha na mutation desfaz a alteração otimista e avisa; depois recupera", async ({ page, loginAs, createAccount, kurio }) => {
  await kurio.open("/");
  const account = await createAccount();
  await loginAs(account, { redirect: "/" });

  // O servidor recusa a PRÓXIMA inclusão de favorito.
  await kurio.inject({ method: "put", path: "/favorites*", behavior: { type: "status", status: 500, code: "INTERNAL" }, times: 1 });

  const button = heart(page, "Emerald Ape #042");
  await button.click();
  // Rollback: volta a "não favoritado" e o usuário é avisado (toast/região ao vivo).
  await expect(page.getByText(/não foi possível/i).first()).toBeVisible();
  await expect(button).toHaveAttribute("aria-pressed", "false");

  // Nova tentativa funciona (a falha foi consumida) e o estado final vem do servidor.
  await kurio.afterResponse("PUT", "/favorites", () => button.click());
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(heart(page, "Emerald Ape #042")).toHaveAttribute("aria-pressed", "true");
});

test("lista de interesse vazia mostra o estado vazio; com itens mostra o grid", async ({ page, loginAs, createAccount, kurio }) => {
  await kurio.open("/");
  const account = await createAccount();
  await loginAs(account, { redirect: "/perfil/favoritos" });
  await expect(page.getByRole("heading", { name: "Sua lista de interesse está vazia" })).toBeVisible();

  await page.goto("/");
  await kurio.afterResponse("PUT", "/favorites", () => heart(page, "Cosmic Bloom #118").click());
  await expect(heart(page, "Cosmic Bloom #118")).toHaveAttribute("aria-pressed", "true");

  await page.goto("/perfil/favoritos");
  await expect(page.getByRole("list", { name: "NFTs favoritos" }).getByRole("heading", { level: 3, name: "Cosmic Bloom #118" })).toBeVisible();
});
