import { Link } from "@tanstack/react-router";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { AppButton } from "@/components/ui";
import { formatEth } from "@/lib/money";
import { diffQuotes, type CheckoutState } from "../machine";

type NeedsReconfirm = Extract<CheckoutState, { status: "needsReconfirm" }>;

/**
 * "O que mudou": aparece quando a cotação mudou (preço/taxa/cupom/estoque) entre a revisão e o envio,
 * ou quando o servidor recusou por QUOTE_CHANGED / AVAILABILITY_CONFLICT. O usuário PRECISA aceitar
 * os novos valores (ou voltar a editar) — o envio com a cotação antiga fica bloqueado.
 */
export function QuoteChangedPanel({ state, onReconfirm, onEdit }: { state: NeedsReconfirm; onReconfirm: () => void; onEdit: () => void }) {
  const diff = state.latest ? diffQuotes(state.reviewed, state.latest) : null;

  return (
    <div role="alert" className="flex flex-col gap-4 rounded-sm border border-warning/40 bg-warning-surface p-4 text-sm">
      <div className="flex items-start gap-2 text-warning">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p className="font-semibold">
          {state.reason === "AVAILABILITY_CONFLICT"
            ? "Alguns itens ficaram sem disponibilidade"
            : "Os valores mudaram desde a sua revisão"}
        </p>
      </div>

      {state.conflicts.length > 0 && (
        <ul className="flex list-disc flex-col gap-1 pl-5 text-foreground">
          {state.conflicts.map((item) => (
            <li key={`${item.nftId}:${item.editionId}`}>
              {item.name}: você pediu {item.requested}, {item.available === 0 ? "esgotou" : `restam ${item.available}`}.
            </li>
          ))}
        </ul>
      )}

      {diff && (
        <ul className="flex flex-col gap-2 text-foreground">
          {diff.lines
            .filter((line) => line.priceChanged || line.unavailable)
            .map((line) => (
              <li key={line.itemId} className="flex flex-wrap items-center gap-x-2">
                <span className="font-semibold">{line.name}:</span>
                {line.unavailable ? (
                  <span>não está mais disponível</span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    {formatEth(line.priceFrom ?? "0")} ETH <ArrowRight className="size-3" aria-hidden="true" />
                    <span className="sr-only">para</span> {formatEth(line.priceTo ?? "0")} ETH
                  </span>
                )}
              </li>
            ))}
          {diff.feeChanged && <li>A taxa de rede foi atualizada.</li>}
          {diff.discountChanged && <li>O desconto foi atualizado.</li>}
          {diff.totalChanged && (
            <li className="inline-flex items-center gap-1 font-bold">
              Total: {formatEth(diff.totalFrom)} ETH <ArrowRight className="size-3" aria-hidden="true" />
              <span className="sr-only">para</span> {formatEth(diff.totalTo)} ETH
            </li>
          )}
        </ul>
      )}

      <div className="flex flex-wrap gap-3">
        {state.latest ? (
          <AppButton onClick={onReconfirm}>Aceitar novos valores</AppButton>
        ) : (
          <AppButton asChild>
            <Link to="/carrinho" onClick={onEdit}>
              Voltar ao carrinho
            </Link>
          </AppButton>
        )}
        <AppButton variant="outline" onClick={onEdit}>
          Voltar e editar
        </AppButton>
      </div>
    </div>
  );
}
