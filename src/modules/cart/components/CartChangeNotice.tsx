import { TriangleAlert } from "lucide-react";
import type { Cart } from "@/contracts";
import { formatEth } from "@/lib/money";

/**
 * Aviso persistente quando preço/disponibilidade mudou enquanto o carrinho estava aberto
 * (tempo real). `role="status"` → anunciado educadamente; o resumo já foi recalculado pela cotação.
 */
export function CartChangeNotice({ cart }: { cart: Cart }) {
  const changed = cart.items.filter((item) => item.status !== "ok");
  if (changed.length === 0) return null;

  return (
    <div role="status" className="mb-4 flex items-start gap-3 rounded-sm border border-warning/40 bg-warning-surface px-4 py-3 text-sm text-warning">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="font-semibold">Seu carrinho foi atualizado</p>
        <ul className="list-disc pl-4 text-xs">
          {changed.map((item) => (
            <li key={item.id}>
              {item.status === "price-changed" && item.priceChangedFrom
                ? `${item.name}: o preço mudou de ${formatEth(item.priceChangedFrom)} ETH para ${formatEth(item.unitPrice)} ETH.`
                : item.status === "unavailable"
                  ? `${item.name} (${item.editionLabel}) não está mais disponível.`
                  : `${item.name} (${item.editionLabel}): disponibilidade reduzida (máx. ${item.maxQuantity}).`}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
