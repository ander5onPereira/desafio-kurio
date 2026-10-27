import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { Container, MobileTopBar } from "@/components/layout";
import {
  AppBreadcrumb,
  AppButton,
  AppEmpty,
  AppError,
  AppModal,
  AppSkeleton,
  AppSkeletonGroup,
} from "@/components/ui";
import { AppEthAmount } from "@/components/shared";
import { NETWORK_LABELS } from "@/contracts";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { CouponForm, QuoteTotals } from "@/modules/quote";
import { useCheckout } from "../useCheckout";
import { CheckoutItems, type CheckoutLine } from "./CheckoutItems";
import { CollectorFields } from "./CollectorFields";
import { ReviewPanel } from "./ReviewPanel";
import { ConnectionBox, ProviderPicker, WalletPicker } from "./WalletSection";

function PaymentSkeleton() {
  return (
    <AppSkeletonGroup label="Carregando pagamento" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_25.3rem] lg:gap-x-16">
      <div className="grid gap-5 md:grid-cols-2">
        {Array.from({ length: 8 }, (_, index) => (
          <AppSkeleton key={index} className="h-16 w-full" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <AppSkeleton className="h-17.5 w-full" />
        <AppSkeleton className="h-17.5 w-full" />
        <AppSkeleton className="h-40 w-full" />
        <AppSkeleton className="h-12 w-full" />
      </div>
    </AppSkeletonGroup>
  );
}

/** Pedido pendente: impede nova compra e leva ao pedido (recuperação após refresh/reconexão). */
function PendingOrderNotice({ orderId }: { orderId: string }) {
  return (
    <div role="status" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-warning/40 bg-warning-surface px-4 py-3 text-sm text-warning">
      <p>Você tem um pedido aguardando confirmação. Acompanhe-o antes de fazer uma nova compra.</p>
      <AppButton asChild size="sm" variant="outline">
        <Link to="/pedidos/$orderId" params={{ orderId }}>
          Ver pedido
        </Link>
      </AppButton>
    </div>
  );
}

/** Pagamento: desktop em 2 colunas (como o Figma); mobile em etapas (Dados → Carteira e rede → Revisão). */
export function PaymentPage() {
  const checkout = useCheckout();
  const isDesktop = useIsDesktop();
  const [switchWalletOpen, setSwitchWalletOpen] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);

  const { state, cart, quote, wallets, selectedWallet, provider, connection, form } = checkout;
  const items = cart.data?.items ?? [];
  const lines: CheckoutLine[] = items.map((item) => ({
    key: item.id,
    name: item.name,
    tokenId: item.tokenId,
    editionLabel: item.editionLabel,
    quantity: item.quantity,
    lineTotal: item.lineTotal,
    image: item.image,
  }));
  const inReview = state.status !== "editing" && state.status !== "completed";
  const loading = cart.isPending || checkout.walletsQuery.isPending;
  const networkLabel = selectedWallet ? NETWORK_LABELS[selectedWallet.network] : null;
  const showSwitch = switchWalletOpen || !selectedWallet;

  const topBarTitle = inReview ? "Revisar pedido" : checkout.step === "wallet" ? "Pagamento com carteira" : "Dados do colecionador";
  const onBack = inReview ? checkout.edit : checkout.step === "wallet" ? () => checkout.setStep("data") : undefined;

  const content = () => {
    if (loading) return <PaymentSkeleton />;
    if (cart.isError) return <AppError error={cart.error} onRetry={() => void cart.refetch()} isRetrying={cart.isFetching} />;
    if (checkout.walletsQuery.isError) {
      return <AppError error={checkout.walletsQuery.error} onRetry={() => void checkout.walletsQuery.refetch()} />;
    }
    if (items.length === 0 && state.status !== "recovering") {
      return (
        <AppEmpty
          icon={<ShoppingBag className="size-10" />}
          title="Seu carrinho está vazio"
          description="Adicione NFTs ao carrinho para finalizar a compra."
          action={
            <AppButton asChild>
              <Link to="/" hash="catalogo">
                Explorar NFTs
              </Link>
            </AppButton>
          }
        />
      );
    }

    const confirmDisabled = checkout.submitBlocked || !quote.data?.purchasable || wallets.length === 0;
    const walletBlock = (
      <div className="flex flex-col gap-4">
        {(isDesktop ? showSwitch : true) && wallets.length > 0 && (
          <WalletPicker wallets={wallets} selectedId={selectedWallet?.id ?? null} onSelect={checkout.selectWallet} />
        )}
        {wallets.length === 0 && <WalletPicker wallets={wallets} selectedId={null} onSelect={checkout.selectWallet} />}
        <ProviderPicker provider={provider} onSelect={checkout.setProvider} />
        <ConnectionBox connection={connection} networkLabel={networkLabel} />
      </div>
    );

    // ---------- Mobile (etapas) ----------
    if (!isDesktop) {
      if (inReview) return <ReviewPanel checkout={checkout} headingLevel={2} />;
      return (
        <form
          id="checkout-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void (checkout.step === "data" ? checkout.goToWalletStep() : checkout.startReview());
          }}
          className="flex flex-col gap-6"
        >
          {checkout.pendingOrder && <PendingOrderNotice orderId={checkout.pendingOrder.id} />}
          <p className="text-xs text-muted-foreground" aria-live="polite">
            Etapa {checkout.step === "data" ? 1 : 2} de 3
          </p>
          {checkout.step === "data" ? (
            <section aria-labelledby="pay-dados" className="flex flex-col gap-5">
              <h2 id="pay-dados" className="font-semibold text-foreground">
                Perfil do colecionador
              </h2>
              <CollectorFields
                form={form}
                showWalletFields={false}
                wallet={selectedWallet}
                provider={provider}
                canSwitchWallet={false}
                switchWalletOpen={false}
                onSwitchWalletChange={() => undefined}
              />
              <AppButton type="submit" size="lg">
                Continuar
              </AppButton>
            </section>
          ) : (
            <>
              <section aria-labelledby="pay-carteira" className="flex flex-col gap-4">
                <h2 id="pay-carteira" className="font-semibold text-foreground">
                  Carteira e rede
                </h2>
                {walletBlock}
              </section>
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-semibold">Total:</span>
                {quote.data ? <AppEthAmount value={quote.data.total} size="lg" /> : <AppSkeleton className="h-6 w-28" />}
              </div>
              <AppButton type="submit" size="lg" disabled={confirmDisabled} isLoading={quote.isFetching && !quote.data}>
                Confirmar compra
              </AppButton>
            </>
          )}
        </form>
      );
    }

    // ---------- Desktop (2 colunas) ----------
    return (
      <>
        {checkout.pendingOrder && <PendingOrderNotice orderId={checkout.pendingOrder.id} />}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_25.3rem] lg:items-start lg:gap-x-16">
          <form
            id="checkout-form"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void checkout.startReview();
            }}
            className="flex flex-col gap-6"
          >
            <h2 className="text-base font-bold text-foreground">Perfil do colecionador</h2>
            <CollectorFields
              form={form}
              showWalletFields
              wallet={selectedWallet}
              provider={provider}
              canSwitchWallet={wallets.length > 1}
              switchWalletOpen={switchWalletOpen}
              onSwitchWalletChange={setSwitchWalletOpen}
            />
            {(showSwitch || wallets.length === 0) && (
              <section aria-labelledby="pay-carteiras" className="flex max-w-xl flex-col gap-3">
                <h2 id="pay-carteiras" className="text-base font-bold text-foreground">
                  Carteiras cadastradas
                </h2>
                <WalletPicker wallets={wallets} selectedId={selectedWallet?.id ?? null} onSelect={checkout.selectWallet} />
              </section>
            )}
          </form>

          <aside aria-label="Resumo do pedido" className="flex flex-col gap-5 lg:sticky lg:top-24">
            <section aria-labelledby="pay-nfts" className="flex flex-col gap-3">
              <h2 id="pay-nfts" className="text-base font-bold text-foreground">
                Seus NFTs
              </h2>
              <CheckoutItems lines={lines} />
            </section>

            <div className="flex flex-col gap-3">
              {couponOpen ? (
                <CouponForm />
              ) : (
                <p className="text-center text-xs text-foreground">
                  Tem um código promocional?{" "}
                  <button type="button" onClick={() => setCouponOpen(true)} className="rounded-xs text-accent-foreground underline underline-offset-4">
                    Aplique aqui
                  </button>
                </p>
              )}
              <QuoteTotals quote={quote.data} isLoading={quote.isPending && quote.fetchStatus !== "idle"} isRefreshing={quote.isFetching} />
            </div>

            <section aria-labelledby="pay-carteira" className="flex flex-col gap-3">
              <h2 id="pay-carteira" className="text-center text-base font-bold text-foreground">
                Carteira e rede
              </h2>
              <ProviderPicker provider={provider} onSelect={checkout.setProvider} />
              <ConnectionBox connection={connection} networkLabel={networkLabel} />
            </section>

            <AppButton type="submit" form="checkout-form" size="lg" disabled={confirmDisabled} isLoading={quote.isFetching && !quote.data}>
              Confirmar compra
            </AppButton>
          </aside>
        </div>

        <AppModal
          open={inReview}
          onOpenChange={(open) => {
            if (!open && state.status !== "submitting") checkout.edit();
          }}
          onEscapeKeyDown={(event) => {
            if (state.status === "submitting" || state.status === "recovering") event.preventDefault();
          }}
          title="Revisar pedido"
          description="Confira os itens, as taxas e a carteira antes de enviar."
          size="lg"
          hideClose={state.status === "submitting"}
        >
          <ReviewPanel checkout={checkout} />
        </AppModal>
      </>
    );
  };

  return (
    <>
      <MobileTopBar title={topBarTitle} backTo={onBack ? undefined : "/carrinho"} onBack={onBack} />
      <Container className="pb-16 md:pt-8">
        <AppBreadcrumb
          className="mb-6 max-md:hidden"
          items={[{ label: "Início", to: "/" }, { label: "Mercado", to: "/", hash: "catalogo" }, { label: "Pagamento" }]}
        />
        <h1 className="sr-only max-md:hidden">Pagamento</h1>
        {content()}
      </Container>
    </>
  );
}
