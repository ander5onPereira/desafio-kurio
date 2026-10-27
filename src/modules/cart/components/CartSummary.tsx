import { Link } from "@tanstack/react-router";
import { loginLinkProps } from "@/components/layout";
import { AppButton, AppError } from "@/components/ui";
import { useAuth } from "@/modules/auth";
import { CouponForm, QuoteTotals, type useQuote } from "@/modules/quote";

type QuoteState = ReturnType<typeof useQuote>;

/**
 * "Resumo da carteira": cupom + valores da cotação + CTA. O botão só avança com cotação vigente
 * e carrinho comprável; visitante vai ao login com retorno para /pagamento.
 */
export function CartSummary({ quote }: { quote: QuoteState }) {
  const { isAuthenticated } = useAuth();
  const loading = quote.isPending && quote.fetchStatus !== "idle";
  const blocked = !quote.data || !quote.data.purchasable;

  return (
    <section aria-labelledby="resumo-carteira" className="flex flex-col gap-5 rounded-lg bg-card p-5 md:rounded-sm md:bg-transparent md:p-0">
      <h2 id="resumo-carteira" className="border-b border-border pb-3 text-base font-bold text-foreground md:text-lg">
        Resumo da carteira
      </h2>

      <CouponForm />

      {quote.isError && !quote.data ? (
        <AppError compact error={quote.error} onRetry={() => void quote.refetch()} isRetrying={quote.isFetching} />
      ) : (
        <QuoteTotals quote={quote.data} isLoading={loading} isRefreshing={quote.isFetching} />
      )}

      <div className="flex flex-col gap-3">
        {blocked ? (
          <>
            <AppButton size="lg" disabled aria-describedby="resumo-bloqueio">
              Conectar e finalizar
            </AppButton>
            {quote.data && !quote.data.purchasable && (
              <p id="resumo-bloqueio" className="text-xs text-warning">
                Ajuste os itens indisponíveis para continuar.
              </p>
            )}
          </>
        ) : (
          <AppButton asChild size="lg">
            {isAuthenticated ? (
              <Link to="/pagamento">Conectar e finalizar</Link>
            ) : (
              <Link {...loginLinkProps("/pagamento")}>Conectar e finalizar</Link>
            )}
          </AppButton>
        )}
        <AppButton asChild variant="link" className="self-center text-center">
          <Link to="/" hash="catalogo">
            Continuar explorando
          </Link>
        </AppButton>
      </div>
    </section>
  );
}
