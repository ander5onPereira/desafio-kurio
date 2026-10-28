import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CircleX, Loader2 } from "lucide-react";
import { Container } from "@/components/layout";
import { AppButton, AppEmpty, AppError, AppModal, AppSkeleton, AppSkeletonGroup } from "@/components/ui";
import { announce } from "@/components/shared";
import { keys, scopeOf } from "@/lib/queryKeys";
import { useAuth } from "@/modules/auth";
import { useOrder } from "../hooks";
import { ReceiptContent } from "./Receipt";

function OrderSkeleton() {
  return (
    <Container className="py-16">
      <AppSkeletonGroup label="Carregando pedido" className="mx-auto flex max-w-xl flex-col gap-4">
        <AppSkeleton className="h-16 w-full" />
        <AppSkeleton className="h-12 w-full" />
        <AppSkeleton className="h-40 w-full" />
      </AppSkeletonGroup>
    </Container>
  );
}

/**
 * Confirmação de pedido. SÓ mostra o recibo quando o pedido está de fato `confirmed` (confirmado pela
 * simulação). `pending` → aguardando (polling + evento); `declined` → recusa com saída clara.
 * Acesso direto/refresh funciona: o estado vem do REST (`GET /orders/:id`).
 */
export function OrderPage({ orderId }: { orderId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = scopeOf(user?.id);
  const order = useOrder(orderId);
  const status = order.data?.status;

  // Pedido terminal: o carrinho mudou no servidor (compra confirmada remove só o comprado).
  useEffect(() => {
    if (status === "confirmed") {
      void queryClient.invalidateQueries({ queryKey: keys.cart(scope) });
      void queryClient.invalidateQueries({ queryKey: keys.quotes(scope) });
      announce("Pedido confirmado. Seus NFTs estão na sua carteira.");
    }
    if (status === "declined") announce("Pedido recusado.", "assertive");
  }, [status, queryClient, scope]);

  if (order.isPending) return <OrderSkeleton />;

  if (order.isError) {
    if (order.error.code === "NOT_FOUND") {
      return (
        <Container className="py-16">
          <AppEmpty
            title="Pedido não encontrado"
            description="Não localizamos este pedido na sua conta."
            action={
              <AppButton asChild>
                <Link to="/">Voltar ao início</Link>
              </AppButton>
            }
          />
        </Container>
      );
    }
    return (
      <Container className="py-16">
        <AppError error={order.error} onRetry={() => void order.refetch()} isRetrying={order.isFetching} />
      </Container>
    );
  }

  const data = order.data;

  if (data.status === "pending") {
    return (
      <Container className="py-16">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-md bg-card px-6 py-12 text-center">
          <Loader2 className="size-10 animate-spin text-accent-foreground" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-foreground">Aguardando confirmação da rede</h1>
          <p role="status" className="max-w-md text-sm text-muted-foreground">
            Seu pedido foi enviado e está sendo confirmado. Você pode recarregar ou fechar esta página: o estado do pedido é
            recuperado sem criar outra compra.
          </p>
          <AppButton asChild variant="outline" size="sm">
            <Link to="/">Voltar ao início</Link>
          </AppButton>
        </div>
      </Container>
    );
  }

  if (data.status === "declined") {
    return (
      <Container className="py-16">
        <div role="alert" className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-md border border-danger/40 bg-danger-surface px-6 py-12 text-center">
          <CircleX className="size-10 text-danger" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-foreground">Pagamento recusado</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            {data.decline?.message ?? "A transação foi recusada."} Nenhum valor foi cobrado e os itens continuam no seu carrinho.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <AppButton asChild>
              <Link to="/pagamento">Tentar novamente</Link>
            </AppButton>
            <AppButton asChild variant="outline">
              <Link to="/carrinho">Voltar ao carrinho</Link>
            </AppButton>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-16">
      <h1 className="sr-only">Pedido confirmado</h1>
      <AppModal
        open
        onOpenChange={(open) => {
          if (!open) void navigate({ to: "/" });
        }}
        title="Pedido confirmado"
        hideTitle
        size="md"
        fullScreenOnMobile
      >
        <ReceiptContent order={data} />
      </AppModal>
    </Container>
  );
}
