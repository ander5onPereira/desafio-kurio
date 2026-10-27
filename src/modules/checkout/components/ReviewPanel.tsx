import { Loader2, WifiOff } from "lucide-react";
import { AppButton } from "@/components/ui";
import { NETWORK_LABELS, WALLET_PROVIDER_LABELS } from "@/contracts";
import { QuoteTotals } from "@/modules/quote";
import { shortAddress } from "../format";
import type { useCheckout } from "../useCheckout";
import { CheckoutItems } from "./CheckoutItems";
import { QuoteChangedPanel } from "./QuoteChangedPanel";

type Checkout = ReturnType<typeof useCheckout>;

/**
 * Revisão do pedido (modal no desktop, etapa 3 no mobile). Cobre os estados da máquina:
 *  reviewing → confirmar | submitting → "Confirmando…" | recovering → reenviar com a MESMA chave |
 *  needsReconfirm → "o que mudou" (confirmação bloqueada até aceitar).
 */
export function ReviewPanel({ checkout, headingLevel = 3 }: { checkout: Checkout; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const { state, form, selectedWallet, provider } = checkout;
  if (state.status === "editing" || state.status === "completed") return null;

  const reviewed = state.reviewed;
  const values = form.getValues();
  const busy = state.status === "submitting";
  const lines = reviewed.lines.map((line) => ({
    key: line.itemId,
    name: line.name,
    tokenId: line.tokenId,
    editionLabel: line.editionLabel,
    quantity: line.quantity,
    lineTotal: line.lineTotal,
    image: line.image,
  }));

  return (
    <div aria-busy={busy || undefined} className="flex flex-col gap-5">
      {state.status === "needsReconfirm" && (
        <QuoteChangedPanel state={state} onReconfirm={checkout.reconfirm} onEdit={checkout.edit} />
      )}

      {state.status === "recovering" && (
        <div role="alert" className="flex flex-col gap-3 rounded-sm border border-warning/40 bg-warning-surface p-4 text-sm">
          <p className="flex items-start gap-2 font-semibold text-warning">
            <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {state.message}
          </p>
          <p className="text-foreground">
            Vamos verificar o seu pedido. Tentar novamente <strong>não cria uma nova compra</strong>: o mesmo pedido é recuperado.
          </p>
          <div>
            <AppButton onClick={() => void checkout.submit()}>Tentar novamente</AppButton>
          </div>
        </div>
      )}

      {checkout.submitError && state.status === "reviewing" && (
        <p role="alert" className="rounded-sm border border-danger/40 bg-danger-surface px-3 py-2 text-sm text-danger">
          {checkout.submitError}
        </p>
      )}

      <section aria-labelledby="revisao-itens" className="flex flex-col gap-3">
        <Heading id="revisao-itens" className="font-semibold text-foreground">
          Seus NFTs
        </Heading>
        <CheckoutItems lines={lines} />
      </section>

      <QuoteTotals quote={reviewed} />

      <section aria-labelledby="revisao-carteira" className="flex flex-col gap-1 text-sm">
        <Heading id="revisao-carteira" className="font-semibold text-foreground">
          Carteira e rede
        </Heading>
        {selectedWallet && (
          <p className="text-muted-foreground">
            {selectedWallet.nickname} · {shortAddress(selectedWallet.address)} · {NETWORK_LABELS[selectedWallet.network]}
            {provider ? ` · ${WALLET_PROVIDER_LABELS[provider]}` : ""}
          </p>
        )}
        <p className="text-muted-foreground">
          Colecionador: {values.displayName} ({values.email})
        </p>
      </section>

      {busy && (
        <p role="status" className="flex items-center gap-2 text-sm text-accent-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Confirmando na carteira… não feche esta página.
        </p>
      )}

      {(state.status === "reviewing" || state.status === "submitting") && (
        <div className="flex flex-wrap justify-end gap-3">
          <AppButton variant="outline" onClick={checkout.edit} disabled={busy}>
            Voltar e editar
          </AppButton>
          <AppButton size="lg" onClick={() => void checkout.submit()} isLoading={busy} disabled={busy}>
            Confirmar e enviar
          </AppButton>
        </div>
      )}
    </div>
  );
}
