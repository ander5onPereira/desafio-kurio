import { useNavigate } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import type { NftDetail, NftEdition } from "@/contracts";
import { AppButton } from "@/components/ui";
import { AppEthAmount, AppQuantityStepper, announce } from "@/components/shared";
import { useAddToCart } from "@/modules/cart";
import { FavoriteButton } from "@/modules/favorites";

interface PurchasePanelProps {
  nft: NftDetail;
  edition: NftEdition;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  layout: "inline" | "bar";
}

export const maxPurchasable = (nft: NftDetail, edition: NftEdition) => Math.min(edition.available, nft.maxPerOrder);

/**
 * Quantidade + Comprar (+ Favoritar no desktop / carrinho no mobile).
 * "Comprar" adiciona ao carrinho e leva a /carrinho (visitante pode; o login é exigido no pagamento).
 */
export function PurchasePanel({ nft, edition, quantity, onQuantityChange, layout }: PurchasePanelProps) {
  const navigate = useNavigate();
  const addToCart = useAddToCart();
  const max = maxPurchasable(nft, edition);
  const unavailable = max < 1;

  async function add(goToCart: boolean) {
    try {
      await addToCart.mutateAsync({ nftId: nft.id, editionId: edition.id, quantity });
      announce(`${quantity} ${quantity === 1 ? "unidade" : "unidades"} de ${nft.name} adicionada${quantity === 1 ? "" : "s"} ao carrinho.`);
      if (goToCart) {
        await navigate({ to: "/carrinho" });
      } else {
        toast.success(`${nft.name} adicionado ao carrinho`, {
          action: { label: "Ver carrinho", onClick: () => void navigate({ to: "/carrinho" }) },
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tente novamente.";
      toast.error("Não foi possível adicionar ao carrinho", { description: message });
      announce(`Não foi possível adicionar ${nft.name} ao carrinho. ${message}`, "assertive");
    }
  }

  const stepper = (
    <AppQuantityStepper
      label={nft.name}
      value={quantity}
      onChange={onQuantityChange}
      min={1}
      max={Math.max(max, 1)}
      disabled={unavailable}
      showLimit
    />
  );

  const unavailableNote = unavailable && (
    <p role="status" className="text-xs font-semibold text-warning">
      Edição indisponível no momento.
    </p>
  );

  if (layout === "bar") {
    return (
      <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-4 rounded-t-3xl border-t border-border bg-card px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Qtd.</span>
            {stepper}
          </div>
          <AppEthAmount value={edition.price} compareAt={edition.compareAtPrice} size="lg" />
        </div>
        {unavailableNote}
        <div className="flex items-center gap-3">
          <AppButton
            size="lg"
            className="flex-1 rounded-full"
            disabled={unavailable}
            isLoading={addToCart.isPending}
            onClick={() => void add(true)}
          >
            Comprar NFT
          </AppButton>
          <AppButton
            variant="secondary"
            size="lg"
            iconOnly
            className="rounded-full"
            aria-label={`Adicionar ${nft.name} ao carrinho`}
            disabled={unavailable || addToCart.isPending}
            onClick={() => void add(false)}
          >
            <ShoppingCart className="size-5" aria-hidden="true" />
          </AppButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {stepper}
        <div className="flex items-center gap-3">
          <AppButton
            className="min-w-32 uppercase"
            disabled={unavailable}
            isLoading={addToCart.isPending}
            onClick={() => void add(true)}
          >
            Comprar
          </AppButton>
          <FavoriteButton nft={nft} variant="button" />
        </div>
      </div>
      {unavailableNote}
    </div>
  );
}
