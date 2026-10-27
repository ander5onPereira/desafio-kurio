import type { Cart } from "@/contracts";
import type { QuoteSettings } from "./settings";

/**
 * Assinatura da cotação = o que, se mudar, exige uma cotação nova: cupom, rede e o estado do carrinho
 * (versão + itens/quantidades). Entra na query key (`keys.quote(scope, signature)`).
 */
export function quoteSignature(settings: Pick<QuoteSettings, "couponCode" | "network">, cart: Cart | undefined): string {
  const cartPart = cart ? `${cart.version}:${cart.items.map((item) => `${item.id}x${item.quantity}`).join(",")}` : "none";
  return [settings.couponCode ?? "-", settings.network, cartPart].join("|");
}
