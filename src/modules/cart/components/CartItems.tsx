import { Link } from "@tanstack/react-router";
import { Trash2, TriangleAlert } from "lucide-react";
import { AppBadge } from "@/components/ui";
import { AppArtwork, AppEthAmount, AppQuantityStepper } from "@/components/shared";
import type { CartItem } from "@/contracts";
import { formatEth } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useRemoveCartItem, useUpdateCartItem } from "../hooks";

/** Aviso textual por linha (nunca só cor): preço mudou, disponibilidade reduzida, esgotado. */
export function CartItemNotice({ item }: { item: CartItem }) {
  if (item.status === "ok") return null;
  const text =
    item.status === "price-changed"
      ? `Preço atualizado${item.priceChangedFrom ? `: de ${formatEth(item.priceChangedFrom)} ETH para ${formatEth(item.unitPrice)} ETH` : ""}`
      : item.status === "limited"
        ? `Disponibilidade reduzida: máx. ${item.maxQuantity}`
        : "Indisponível no momento";
  return (
    <AppBadge variant={item.status === "unavailable" ? "danger" : "warning"} className="w-fit gap-1 normal-case">
      <TriangleAlert className="size-3" aria-hidden="true" />
      {text}
    </AppBadge>
  );
}

function useItemActions(item: CartItem) {
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  return {
    changeQuantity: (quantity: number) => update.mutate({ itemId: item.id, quantity }),
    remove: () => remove.mutate({ itemId: item.id, name: item.name }),
    disabled: remove.isPending,
  };
}

function RemoveButton({ item, className }: { item: CartItem; className?: string }) {
  const { remove, disabled } = useItemActions(item);
  return (
    <button
      type="button"
      onClick={remove}
      disabled={disabled}
      aria-label={`Remover ${item.name} do carrinho`}
      className={cn("inline-flex size-9 items-center justify-center rounded-sm text-accent-foreground transition-colors hover:bg-border disabled:opacity-50", className)}
    >
      <Trash2 className="size-5" aria-hidden="true" />
    </button>
  );
}

function ItemStepper({ item }: { item: CartItem }) {
  const { changeQuantity } = useItemActions(item);
  return (
    <AppQuantityStepper
      value={item.quantity}
      onChange={changeQuantity}
      min={1}
      max={Math.max(item.maxQuantity, 1)}
      label={item.name}
      size="sm"
      disabled={item.maxQuantity === 0}
    />
  );
}

function ItemName({ item }: { item: CartItem }) {
  return (
    <Link to="/nft/$nftId" params={{ nftId: item.nftId }} className="rounded-xs font-bold text-foreground hover:text-accent-foreground">
      {item.name}
    </Link>
  );
}

/** Desktop/tablet: tabela semântica (NFTs · Preço · Edições · Total · remover), como no Figma. */
export function CartTable({ items }: { items: readonly CartItem[] }) {
  return (
    <table className="w-full border-separate border-spacing-y-3 text-sm">
      <caption className="sr-only">Itens do carrinho</caption>
      <thead>
        <tr className="text-left text-foreground">
          <th scope="col" className="border-b border-border pb-3 font-semibold">
            NFTs
          </th>
          <th scope="col" className="border-b border-border pb-3 font-semibold">
            Preço
          </th>
          <th scope="col" className="border-b border-border pb-3 font-semibold">
            Edições
          </th>
          <th scope="col" className="border-b border-border pb-3 font-semibold">
            Total
          </th>
          <th scope="col" className="border-b border-border pb-3">
            <span className="sr-only">Ações</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="bg-card align-middle">
            <td className="rounded-l-sm p-0">
              <div className="flex items-center gap-4">
                <AppArtwork artwork={item.image} variant="thumb" className="size-[4.375rem] shrink-0 rounded-sm" />
                <div className="flex min-w-0 flex-col gap-1 py-2 pr-2">
                  <ItemName item={item} />
                  <span className="text-xs text-muted-foreground">
                    ID do token: #{item.tokenId} · Edição {item.editionLabel}
                  </span>
                  <CartItemNotice item={item} />
                </div>
              </div>
            </td>
            <td className="px-2">
              <AppEthAmount value={item.unitPrice} size="md" />
            </td>
            <td className="px-2">
              <ItemStepper item={item} />
            </td>
            <td className="px-2">
              <AppEthAmount value={item.lineTotal} size="md" />
            </td>
            <td className="rounded-r-sm pr-3 text-right">
              <RemoveButton item={item} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Mobile: cards empilhados (miniatura, nome, edição, preço, stepper e lixeira). */
export function CartList({ items }: { items: readonly CartItem[] }) {
  return (
    <ul aria-label="Itens do carrinho" className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.id} className="flex gap-3 overflow-hidden rounded-lg bg-card">
          <AppArtwork artwork={item.image} variant="thumb" className="size-[6.25rem] shrink-0 object-cover" />
          <div className="flex min-w-0 flex-1 flex-col gap-1 py-3 pr-3">
            <div className="flex items-start justify-between gap-2">
              <ItemName item={item} />
              <RemoveButton item={item} className="-mr-2 -mt-1 size-8" />
            </div>
            <span className="text-xs text-muted-foreground">Edição: {item.editionLabel}</span>
            <CartItemNotice item={item} />
            <div className="mt-auto flex items-end justify-between gap-2 pt-1">
              <AppEthAmount value={item.lineTotal} size="lg" />
              <ItemStepper item={item} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
