import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { Container, MobileTopBar } from "@/components/layout";
import { AppBreadcrumb, AppButton, AppEmpty, AppError, AppSkeleton, AppSkeletonGroup } from "@/components/ui";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { useQuote } from "@/modules/quote";
import { useCart } from "../hooks";
import { AlsoViewed } from "./AlsoViewed";
import { CartChangeNotice } from "./CartChangeNotice";
import { CartList, CartTable } from "./CartItems";
import { CartSummary } from "./CartSummary";

function CartSkeleton() {
  return (
    <AppSkeletonGroup label="Carregando carrinho" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20.75rem] lg:gap-x-16">
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, index) => (
          <AppSkeleton key={index} className="h-25 w-full md:h-17.5" />
        ))}
      </div>
      <div className="flex flex-col gap-4">
        <AppSkeleton className="h-7 w-48" />
        <AppSkeleton className="h-16 w-full" />
        <AppSkeleton className="h-40 w-full" />
        <AppSkeleton className="h-12 w-full" />
      </div>
    </AppSkeletonGroup>
  );
}

export function CartPage() {
  const isDesktop = useIsDesktop();
  const cart = useCart();
  const quote = useQuote();
  const items = cart.data?.items ?? [];

  return (
    <>
      <MobileTopBar title="Carrinho de NFTs" backTo="/" />
      <Container className="pb-16 md:pt-8">
        <AppBreadcrumb
          className="mb-6 max-md:hidden"
          items={[{ label: "Início", to: "/" }, { label: "Mercado", to: "/", hash: "catalogo" }, { label: "Carrinho" }]}
        />
        <h1 className="sr-only max-md:hidden">Carrinho de NFTs</h1>

        {cart.isPending ? (
          <CartSkeleton />
        ) : cart.isError ? (
          <AppError error={cart.error} onRetry={() => void cart.refetch()} isRetrying={cart.isFetching} />
        ) : items.length === 0 ? (
          <AppEmpty
            icon={<ShoppingBag className="size-10" />}
            title="Seu carrinho está vazio"
            description="Explore o mercado e adicione NFTs para continuar."
            action={
              <AppButton asChild>
                <Link to="/" hash="catalogo">
                  Explorar NFTs
                </Link>
              </AppButton>
            }
          />
        ) : (
          <>
            <CartChangeNotice cart={cart.data} />
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20.75rem] lg:items-start lg:gap-x-16">
              <div className="min-w-0">{isDesktop ? <CartTable items={items} /> : <CartList items={items} />}</div>
              <div className="lg:sticky lg:top-24">
                <CartSummary quote={quote} />
              </div>
            </div>
            {items[0] && <AlsoViewed nftId={items[0].nftId} />}
          </>
        )}
      </Container>
    </>
  );
}
