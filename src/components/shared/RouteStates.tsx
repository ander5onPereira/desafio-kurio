import { Link, type ErrorComponentProps } from "@tanstack/react-router";
import { AppButton } from "@/components/ui/AppButton";
import { AppError } from "@/components/ui/AppError";
import { AppSkeleton, AppSkeletonGroup } from "@/components/ui/AppSkeleton";
import { Container } from "@/components/layout/Container";

/**
 * Estados padrão de rota (usados em router.ts). Nomes exportados são contrato: RoutePending,
 * RouteError, RouteNotFound.
 */

/** Esqueleto de página genérico (título + blocos), com dimensões fixas para não gerar CLS. */
export function RoutePending() {
  return (
    <Container className="py-8">
      <AppSkeletonGroup label="Carregando página" className="flex flex-col gap-6">
        <AppSkeleton className="h-8 w-56" />
        <div className="grid gap-6 md:grid-cols-3">
          <AppSkeleton className="h-64" />
          <AppSkeleton className="h-64" />
          <AppSkeleton className="h-64" />
        </div>
        <AppSkeleton className="h-40" />
      </AppSkeletonGroup>
    </Container>
  );
}

/** Erro de carregamento de rota com recuperação ("Tentar novamente"). */
export function RouteError({ error, reset }: ErrorComponentProps) {
  return (
    <Container className="py-12">
      <h1 className="sr-only">Erro ao carregar a página</h1>
      <AppError error={error} onRetry={reset} />
    </Container>
  );
}

/** 404 — rota inexistente. */
export function RouteNotFound() {
  return (
    <Container className="flex flex-col items-center gap-4 py-24 text-center">
      <p aria-hidden="true" className="text-6xl font-bold text-primary">
        404
      </p>
      <h1 className="text-2xl font-bold text-foreground">Página não encontrada</h1>
      <p className="max-w-md text-sm text-muted-foreground">O endereço que você tentou abrir não existe ou foi movido.</p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <AppButton asChild>
          <Link to="/">Voltar ao início</Link>
        </AppButton>
        <AppButton asChild variant="outline">
          <Link to="/" hash="catalogo">
            Explorar o mercado
          </Link>
        </AppButton>
      </div>
    </Container>
  );
}
