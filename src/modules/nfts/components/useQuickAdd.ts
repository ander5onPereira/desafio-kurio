import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { NftSummary } from "@/contracts";
import { announce } from "@/components/shared";
import { useAddToCart } from "@/modules/cart";
import { nftDetailOptions } from "../hooks";

/**
 * "Adicionar ao carrinho" direto do card (ícone do carrinho): usa a edição padrão do NFT.
 * O resumo do card não traz a edição, então buscamos o detalhe (normalmente já em cache pelo
 * prefetch do hover) e adicionamos 1 unidade. Edição esgotada ou erro → aviso claro.
 */
export function useQuickAdd() {
  const queryClient = useQueryClient();
  const addToCart = useAddToCart();
  const navigate = useNavigate();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function quickAdd(nft: NftSummary) {
    setPendingId(nft.id);
    try {
      const detail = await queryClient.fetchQuery(nftDetailOptions(nft.id));
      const edition = detail.editions.find((item) => item.id === detail.defaultEditionId) ?? detail.editions[0];
      if (!edition || edition.available < 1) {
        toast.error(`${nft.name} está esgotado.`);
        announce(`${nft.name} está esgotado.`, "assertive");
        return;
      }
      await addToCart.mutateAsync({ nftId: nft.id, editionId: edition.id, quantity: 1 });
      toast.success(`${nft.name} adicionado ao carrinho`, {
        action: { label: "Ver carrinho", onClick: () => void navigate({ to: "/carrinho" }) },
      });
      announce(`${nft.name} adicionado ao carrinho.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tente novamente.";
      toast.error("Não foi possível adicionar ao carrinho", { description: message });
      announce(`Não foi possível adicionar ${nft.name} ao carrinho.`, "assertive");
    } finally {
      setPendingId(null);
    }
  }

  return { quickAdd, pendingId };
}
