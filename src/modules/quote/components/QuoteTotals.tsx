import type { Quote } from "@/contracts";
import { AppSkeleton, AppSkeletonGroup } from "@/components/ui";
import { AppEthAmount } from "@/components/shared";
import { cn } from "@/lib/utils";

interface QuoteTotalsProps {
  quote: Quote | undefined;
  /** Primeira carga (sem cotação ainda): mostra o skeleton com a MESMA altura do conteúdo. */
  isLoading?: boolean;
  /** Recalculando em segundo plano (mantém os valores atuais na tela). */
  isRefreshing?: boolean;
  className?: string;
}

/** Altura fixa = a das 4 linhas reais (evita deslocamento de layout quando a cotação chega). */
export function QuoteTotalsSkeleton({ className }: { className?: string }) {
  return (
    <AppSkeletonGroup label="Calculando valores" className={cn("flex min-h-40 flex-col gap-3", className)}>
      <AppSkeleton className="h-6 w-full" />
      <AppSkeleton className="h-6 w-full" />
      <AppSkeleton className="h-6 w-full" />
      <AppSkeleton className="mt-3 h-7 w-full" />
    </AppSkeletonGroup>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

/**
 * Resumo de valores — TUDO vem da cotação da API (subtotal, desconto, taxa de rede, total).
 * O front nunca soma: apenas exibe (README: "valores coerentes com a resposta da API").
 */
export function QuoteTotals({ quote, isLoading, isRefreshing, className }: QuoteTotalsProps) {
  if (isLoading || !quote) return <QuoteTotalsSkeleton className={className} />;

  return (
    <dl aria-busy={isRefreshing || undefined} className={cn("flex min-h-40 flex-col gap-3 text-sm", className)}>
      <Row label="Subtotal">
        <AppEthAmount value={quote.subtotal} tone="foreground" size="md" />
      </Row>
      <Row label={quote.discount.label}>
        <AppEthAmount value={quote.discount.amount} unit={false} prefix="(-)" tone="foreground" size="md" />
      </Row>
      <Row label="Taxa de rede">
        <AppEthAmount value={quote.networkFee} tone="foreground" size="md" />
        {quote.feeEstimated && <span className="mt-1 block text-xs text-accent-foreground">Taxa estimada</span>}
      </Row>
      <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-border pt-4">
        <dt className="text-foreground">Total</dt>
        <dd className="text-right">
          <AppEthAmount value={quote.total} tone="primary" size="lg" />
        </dd>
      </div>
    </dl>
  );
}
