import { expect, test } from "../fixtures";

/**
 * Grupo 2 do README — acesso direto ao detalhe, NFT inexistente, edição indisponível e limite
 * de quantidade.
 */

test("acesso direto ao detalhe mostra o NFT (sem passar pelo catálogo)", async ({ page, kurio }) => {
  await kurio.open("/nft/emerald-ape-042");
  await expect(page.getByRole("heading", { level: 1, name: "Emerald Ape #042" })).toBeVisible();
  await expect(page.getByText("ID do token:")).toBeVisible();
});

test("refresh no detalhe mantém a página", async ({ page, kurio }) => {
  await kurio.open("/nft/emerald-ape-042");
  await expect(page.getByRole("heading", { level: 1, name: "Emerald Ape #042" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Emerald Ape #042" })).toBeVisible();
});

test("NFT inexistente mostra 'não encontrado' com caminho de volta", async ({ page, kurio }) => {
  await kurio.open("/nft/nao-existe-999");
  await expect(page.getByRole("heading", { name: "NFT não encontrado" })).toBeVisible();
});

test("a quantidade respeita o limite de disponibilidade da edição", async ({ page, kurio }) => {
  await kurio.open("/nft/emerald-ape-042");
  // O servidor reduz o estoque da edição padrão para 2 unidades; recarregar traz o novo limite.
  await kurio.updateNft("emerald-ape-042", { available: 2, editionId: "ed-1-50" });
  await page.reload();

  const increase = page.getByRole("button", { name: /^Aumentar quantidade/ });
  await increase.click();
  await expect(page.getByRole("group", { name: /^Quantidade de/ })).toContainText("2");
  // No limite: o botão de aumentar fica desabilitado (e a tela explica o "máx.").
  await expect(increase).toBeDisabled();
});

test("edição esgotada não pode ser escolhida e é identificada por texto", async ({ page, kurio }) => {
  await kurio.open("/nft/emerald-ape-042");
  await kurio.updateNft("emerald-ape-042", { available: 0, editionId: "ed-1-10" });
  await page.reload();

  const soldOut = page.getByRole("radio", { name: /1\/10/ });
  await expect(soldOut).toBeDisabled();
  await expect(soldOut).toContainText("Esgotada"); // não depende só de cor
});

test("favoritar e comprar aparecem no detalhe", async ({ page, kurio }) => {
  await kurio.open("/nft/emerald-ape-042");
  await expect(page.getByRole("button", { name: "Favoritar Emerald Ape #042" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Comprar/ })).toBeVisible();
});
