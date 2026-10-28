import { buyFromDetail, connectWallet, expect, goToPayment, listOrders, reviewAndSubmit, test } from "../fixtures";

/**
 * Grupo 10 do README — eventos duplicados ou antigos, desconexão e retomada de pedido pendente.
 * Regras: duplicata não reaplica efeitos; evento com versão antiga nunca regride o estado;
 * sem rede o usuário recupera o pedido sem criar outra compra.
 */

const NFT = "emerald-ape-042";
const EDITION = "ed-1-50";

test("evento duplicado não reaplica o efeito", async ({ page, kurio }) => {
  await kurio.open(`/nft/${NFT}`);
  await expect(page.getByText("1.19").first()).toBeVisible();

  const { eventId } = await kurio.updateNft(NFT, { price: "1.49", editionId: EDITION });
  await expect(page.getByText("1.49").first()).toBeVisible();

  await kurio.replayEvent(eventId);
  await expect(page.getByText("1.49").first()).toBeVisible();
  await expect(page.getByText("1.19")).toHaveCount(0);
});

test("evento antigo (versão menor) nunca regride um estado mais recente", async ({ page, kurio }) => {
  await kurio.open(`/nft/${NFT}`);
  await kurio.updateNft(NFT, { price: "1.49", editionId: EDITION });
  await kurio.updateNft(NFT, { price: "1.59", editionId: EDITION });
  await expect(page.getByText("1.59").first()).toBeVisible();

  await kurio.emitStale(NFT);
  // Se regredisse, o preço antigo voltaria a aparecer; esperamos o estado novo se manter.
  await expect(page.getByText("1.59").first()).toBeVisible();
  await expect(page.getByText("1.49")).toHaveCount(0);
});

test("queda do websocket: ao reconectar a tela reconcilia com o servidor", async ({ page, kurio }) => {
  await kurio.open(`/nft/${NFT}`);
  await expect(page.getByText("1.19").first()).toBeVisible();

  await kurio.dropSocket();
  // Muda o preço enquanto o cliente está desconectado (evento perdido).
  await kurio.updateNft(NFT, { price: "1.88", editionId: EDITION });
  await kurio.restoreSocket();

  await expect(page.getByText("1.88").first()).toBeVisible({ timeout: 20_000 });
});

test("desconexão com pedido pendente: o usuário recupera o resultado sem criar outra compra", async ({ page, kurio, loginAs, isMobile }) => {
  await loginAs("ana", { redirect: "/", scenario: "socket-drop" });
  await buyFromDetail(page, NFT, isMobile);
  await goToPayment(page);
  await connectWallet(page, isMobile);
  await expect(page.getByText("Carteira conectada")).toBeVisible();
  await reviewAndSubmit(page);

  // O socket cai ao criar o pedido; o estado final chega por reconciliação (REST/polling).
  await expect(page.getByText("Seus NFTs agora estão na sua carteira")).toBeVisible({ timeout: 30_000 });
  expect(await listOrders(kurio)).toHaveLength(1);
});

test("recarregar com pedido pendente retoma o estado do mesmo pedido", async ({ page, kurio, loginAs, isMobile }) => {
  await loginAs("ana", { redirect: "/" });
  await buyFromDetail(page, NFT, isMobile);
  await goToPayment(page);
  await connectWallet(page, isMobile);
  await expect(page.getByText("Carteira conectada")).toBeVisible();
  await reviewAndSubmit(page);

  await expect(page).toHaveURL(/\/pedidos\//);
  await page.reload();
  await expect(page.getByText("Seus NFTs agora estão na sua carteira")).toBeVisible({ timeout: 30_000 });
  expect(await listOrders(kurio)).toHaveLength(1);
});
