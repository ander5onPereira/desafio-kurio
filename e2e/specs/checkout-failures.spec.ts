import type { Page } from "@playwright/test";
import {
  buyFromDetail,
  cartItems,
  connectWallet,
  expect,
  goToPayment,
  listOrders,
  reviewAndSubmit,
  test,
} from "../fixtures";

/**
 * Grupo 7 do README (+ conflitos de checkout) — falha de pagamento, clique repetido e timeout com
 * recuperação do MESMO pedido (idempotência), preço alterado e edição esgotada durante a compra.
 */

async function reachReview(page: Page, isMobile: boolean) {
  await buyFromDetail(page, "emerald-ape-042", isMobile);
  await goToPayment(page);
  await connectWallet(page, isMobile);
  await expect(page.getByText("Carteira conectada")).toBeVisible();
}

test("pagamento recusado mostra o resultado e preserva o carrinho", async ({ page, kurio, loginAs, isMobile }) => {
  await loginAs("ana", { redirect: "/", scenario: "payment-declined" });
  await reachReview(page, isMobile);
  await reviewAndSubmit(page);

  await expect(page.getByRole("heading", { name: "Pagamento recusado" })).toBeVisible();
  await expect(page.getByText("Seus NFTs agora estão na sua carteira")).toHaveCount(0);

  const orders = await listOrders(kurio);
  expect(orders.map((order) => order.status)).toEqual(["declined"]);
  // Falha: os itens continuam no carrinho.
  expect((await cartItems(kurio)).map((item) => item.nftId)).toContain("emerald-ape-042");
});

test("clique repetido em 'Confirmar e enviar' cria UM único pedido", async ({ page, kurio, loginAs, isMobile }) => {
  await loginAs("ana", { redirect: "/" });
  await reachReview(page, isMobile);

  await page.getByRole("button", { name: "Confirmar compra" }).click();
  const submit = page.getByRole("button", { name: "Confirmar e enviar" });
  await submit.dblclick({ delay: 0 });
  await submit.click({ force: true, noWaitAfter: true }).catch(() => undefined);

  await expect(page.getByText("Seus NFTs agora estão na sua carteira")).toBeVisible();
  expect(await listOrders(kurio)).toHaveLength(1);
});

test("timeout após criar o pedido: o reenvio recupera o MESMO pedido (idempotência)", async ({ page, kurio, loginAs, isMobile }) => {
  await loginAs("ana", { redirect: "/", scenario: "order-timeout" });
  await reachReview(page, isMobile);
  await reviewAndSubmit(page);

  // A resposta nunca chega: a UI avisa que vai recuperar, sem criar outra compra.
  await expect(page.getByText(/não cria uma nova compra/)).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Tentar novamente" }).click();

  await expect(page.getByText("Seus NFTs agora estão na sua carteira")).toBeVisible();
  // Prova no servidor: continua havendo exatamente UM pedido.
  expect(await listOrders(kurio)).toHaveLength(1);
});

test("preço mudou durante a compra: exige nova confirmação e só então cria o pedido", async ({ page, kurio, loginAs, isMobile }) => {
  await loginAs("ana", { redirect: "/", scenario: "price-changed-on-checkout" });
  await reachReview(page, isMobile);
  await reviewAndSubmit(page);

  await expect(page.getByRole("button", { name: "Aceitar novos valores" })).toBeVisible();
  expect(await listOrders(kurio)).toHaveLength(0); // nada foi criado com a cotação velha
  await expect(page.getByText("Seus NFTs agora estão na sua carteira")).toHaveCount(0);

  await page.getByRole("button", { name: "Aceitar novos valores" }).click();
  await page.getByRole("button", { name: "Confirmar e enviar" }).click();
  await expect(page.getByText("Seus NFTs agora estão na sua carteira")).toBeVisible();
});

test("edição esgotada durante a compra: avisa, não cria pedido e preserva o carrinho", async ({ page, kurio, loginAs, isMobile }) => {
  await loginAs("ana", { redirect: "/", scenario: "sold-out-on-checkout" });
  await reachReview(page, isMobile);
  await reviewAndSubmit(page);

  await expect(page.getByText(/não está mais disponível/)).toBeVisible();
  expect(await listOrders(kurio)).toHaveLength(0);
  expect((await cartItems(kurio)).map((item) => item.nftId)).toContain("emerald-ape-042");
});

test("conexão da carteira recusada: mostra a recusa e permite tentar de novo", async ({ page, loginAs, isMobile }) => {
  await loginAs("ana", { redirect: "/", scenario: "wallet-rejected" });
  await buyFromDetail(page, "emerald-ape-042", isMobile);
  await goToPayment(page);
  await connectWallet(page, isMobile);

  await expect(page.getByText(/recusad/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
});
