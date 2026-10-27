import { cartItems, expect, listOrders, purchaseThroughCheckout, test } from "../fixtures";

/**
 * Grupo 6 do README — compra completa, do catálogo ao recibo confirmado.
 * Eliminatório: a confirmação só aparece se o pedido foi REALMENTE confirmado pela simulação.
 */

test("compra completa: detalhe → carrinho → pagamento → recibo confirmado", async ({ page, kurio, loginAs, isMobile }) => {
  await loginAs("ana", { redirect: "/" });
  await purchaseThroughCheckout(page, isMobile);

  // Recibo (rota própria, acesso direto/refresh possível).
  await expect(page).toHaveURL(/\/pedidos\//);
  await expect(page.getByText("Seus NFTs agora estão na sua carteira")).toBeVisible();
  await expect(page.getByText("Emerald Ape #042").first()).toBeVisible();

  // Resultado no servidor simulado: existe um pedido CONFIRMADO com esse item.
  const orders = await listOrders(kurio);
  const confirmed = orders.filter((order) => order.status === "confirmed");
  expect(confirmed).toHaveLength(1);
  expect(confirmed[0]!.lines.map((line) => line.name)).toContain("Emerald Ape #042");

  // O carrinho perde apenas o que foi comprado.
  expect((await cartItems(kurio)).some((item) => item.nftId === "emerald-ape-042")).toBe(false);
});

test("o recibo sobrevive ao refresh e mantém o snapshot do pedido", async ({ page, kurio, loginAs, isMobile }) => {
  await loginAs("ana", { redirect: "/" });
  await purchaseThroughCheckout(page, isMobile);
  await expect(page.getByText("Seus NFTs agora estão na sua carteira")).toBeVisible();

  const receiptUrl = page.url();
  const [order] = (await listOrders(kurio)).filter((item) => item.status === "confirmed");
  const paid = order!.lines[0]!.unitPrice;

  // O catálogo muda DEPOIS da compra: o recibo não pode mudar.
  await kurio.updateNft("emerald-ape-042", { price: "9.99", editionId: "ed-1-50" });
  await page.goto(receiptUrl);
  await expect(page.getByText("Seus NFTs agora estão na sua carteira")).toBeVisible();
  await expect(page.getByText("9.99")).toHaveCount(0);
  await expect(page.getByText(paid).first()).toBeVisible();
});

test("a confirmação não aparece para pedido que não foi confirmado", async ({ page, kurio, loginAs }) => {
  await loginAs("ana", { redirect: "/" });
  // Pedido inexistente: nada de recibo, só o estado de "não encontrado".
  await page.goto("/pedidos/ord_inexistente");
  await expect(page.getByText("Seus NFTs agora estão na sua carteira")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Pedido não encontrado" })).toBeVisible();
  expect((await listOrders(kurio)).length).toBe(0);
});
