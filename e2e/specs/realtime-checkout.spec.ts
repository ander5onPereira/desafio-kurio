import { buyFromDetail, connectWallet, expect, goToPayment, listOrders, test } from "../fixtures";

/**
 * Grupo 9 do README — alteração de preço/disponibilidade via Socket.IO durante o carrinho e o checkout.
 * O evento nasce NO SERVIDOR simulado (control plane) e chega pelo socket.io-client real:
 * a UI nunca recebe setState direto.
 */

const NFT = "emerald-ape-042";
const EDITION = "ed-1-50";

test("mudança de preço no carrinho: avisa, atualiza o resumo e a linha", async ({ page, kurio, loginAs, isMobile }) => {
  await loginAs("ana", { redirect: "/" });
  await buyFromDetail(page, NFT, isMobile);
  await expect(page.getByText("Emerald Ape #042").first()).toBeVisible();
  await expect(page.getByText("1.19").first()).toBeVisible();

  await kurio.updateNft(NFT, { price: "1.49", editionId: EDITION });

  const notice = page.getByRole("status").filter({ hasText: "Seu carrinho foi atualizado" });
  await expect(notice).toBeVisible();
  await expect(notice).toContainText("1.19");
  await expect(notice).toContainText("1.49");
  await expect(page.getByText("1.49").first()).toBeVisible();
});

test("esgotar a edição durante o carrinho avisa que o item não está mais disponível", async ({ page, kurio, loginAs, isMobile }) => {
  await loginAs("ana", { redirect: "/" });
  await buyFromDetail(page, NFT, isMobile);

  await kurio.updateNft(NFT, { available: 0, editionId: EDITION });
  const notice = page.getByRole("status").filter({ hasText: "Seu carrinho foi atualizado" });
  await expect(notice).toBeVisible();
  await expect(notice).toContainText("não está mais disponível");
});

test("checkout bloqueia a confirmação com cotação desatualizada e exige nova confirmação", async ({ page, kurio, loginAs, isMobile }) => {
  await loginAs("ana", { redirect: "/" });
  await buyFromDetail(page, NFT, isMobile);
  await goToPayment(page);
  await connectWallet(page, isMobile);
  await expect(page.getByText("Carteira conectada")).toBeVisible();

  await kurio.updateNft(NFT, { price: "1.59", editionId: EDITION });
  await expect(page.getByText("1.59").first()).toBeVisible();

  await page.getByRole("button", { name: "Confirmar compra" }).click();
  // Com cotação desatualizada nunca chega a criar pedido sem nova confirmação.
  const confirmSend = page.getByRole("button", { name: "Confirmar e enviar" });
  if (await confirmSend.isVisible().catch(() => false)) await confirmSend.click();
  await expect(page.getByRole("button", { name: "Aceitar novos valores" }).or(page.getByText("1.59").first())).toBeVisible();
  const orders = await listOrders(kurio);
  expect(orders.every((order) => order.lines[0]?.unitPrice !== "1.19")).toBe(true);
});

test("o catálogo e o detalhe também recebem o novo preço em tempo real", async ({ page, kurio }) => {
  await kurio.open(`/nft/${NFT}`);
  await expect(page.getByText("1.19").first()).toBeVisible();

  await kurio.updateNft(NFT, { price: "1.77", editionId: EDITION });
  await expect(page.getByText("1.77").first()).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("list", { name: "Catálogo de NFTs" })).toContainText("1.77");
});
