import { expect, type Page } from "@playwright/test";
import type { KurioClient } from "./kurio";

export async function buyFromDetail(page: Page, nftId: string, isMobile: boolean): Promise<void> {
  await page.goto(`/nft/${nftId}`);
  await page.getByRole("button", { name: isMobile ? "Comprar NFT" : "Comprar", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/carrinho");
}

export async function goToPayment(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Conectar e finalizar" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/pagamento");
}

/**
 * Seleciona o provedor e conecta a carteira (conexão simulada). No mobile o pagamento é em
 * etapas: "Continuar" leva da etapa de dados para a de carteira.
 */
export async function connectWallet(page: Page, isMobile: boolean, provider = "MetaMask"): Promise<void> {
  if (isMobile) await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("radio", { name: new RegExp(provider) }).click();
  await page.getByRole("button", { name: /Conectar carteira|Tentar novamente/ }).click();
}

export async function reviewAndSubmit(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await page.getByRole("button", { name: "Confirmar e enviar" }).click();
}

export async function purchaseThroughCheckout(page: Page, isMobile: boolean, nftId = "emerald-ape-042"): Promise<void> {
  await buyFromDetail(page, nftId, isMobile);
  await goToPayment(page);
  await connectWallet(page, isMobile);
  await expect(page.getByText("Carteira conectada")).toBeVisible();
  await reviewAndSubmit(page);
}

interface OrderSummary {
  id: string;
  status: "pending" | "confirmed" | "declined";
  total: string;
  lines: Array<{ name: string; quantity: number; unitPrice: string }>;
}

export async function listOrders(kurio: KurioClient): Promise<OrderSummary[]> {
  const { status, json } = await kurio.serverFetch<{ items: OrderSummary[] }>("/orders");
  expect(status).toBe(200);
  return json.items;
}

export async function cartItems(kurio: KurioClient): Promise<Array<{ nftId: string; quantity: number }>> {
  const { json } = await kurio.serverFetch<{ items: Array<{ nftId: string; quantity: number }> }>("/cart");
  return json.items;
}
