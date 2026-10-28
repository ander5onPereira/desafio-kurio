import { Link } from "@tanstack/react-router";
import type { UseQueryResult } from "@tanstack/react-query";
import { SearchX } from "lucide-react";
import type { NftListResponse } from "@/contracts";
import type { ApiError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { AppButton, AppEmpty, AppError, AppPagination } from "@/components/ui";
import { hasActiveFilters, applyPatch, type CatalogSearch } from "../searchParams";
import { NftGrid, NftGridSkeleton } from "./NftGrid";

interface CatalogResultsProps {
  query: UseQueryResult<NftListResponse, ApiError>;
  search: CatalogSearch;
  onClear: () => void;
}

function scrollToCatalog() {
  // "auto" respeita prefers-reduced-motion (sem rolagem animada).
  requestAnimationFrame(() => document.getElementById("catalogo")?.scrollIntoView({ behavior: "auto", block: "start" }));
}

export function CatalogResults({ query, search, onClear }: CatalogResultsProps) {
  const { data, isPending, isError, error, refetch, isFetching, isPlaceholderData } = query;

  if (isPending) return <NftGridSkeleton label="Carregando catálogo" />;

  if (isError && !data) {
    return <AppError error={error} title="Não foi possível carregar o catálogo" onRetry={() => void refetch()} isRetrying={isFetching} />;
  }
  if (!data) return null;

  const { items, pagination } = data;
  const filtered = hasActiveFilters(search);

  return (
    <div aria-busy={isFetching} className={cn("flex flex-col gap-8 transition-opacity", isPlaceholderData && "opacity-60")}>
      {isError && (
        <AppError compact error={error} title="Não foi possível atualizar os resultados" onRetry={() => void refetch()} isRetrying={isFetching} />
      )}

      <p role="status" className="sr-only">
        {pagination.total === 0 ? "Nenhum NFT encontrado." : `${pagination.total} ${pagination.total === 1 ? "NFT encontrado" : "NFTs encontrados"}. Página ${pagination.page} de ${pagination.totalPages}.`}
      </p>

      {items.length === 0 ? (
        <AppEmpty
          icon={<SearchX className="size-10" />}
          title="Nenhum NFT encontrado"
          description={filtered ? "Nenhum resultado para esses filtros. Tente remover algum deles." : "O catálogo está vazio no momento. Volte em breve."}
          action={
            filtered ? (
              <AppButton variant="outline" onClick={onClear}>
                Limpar filtros
              </AppButton>
            ) : undefined
          }
        />
      ) : (
        <NftGrid items={items} label="Catálogo de NFTs" priorityCount={3} />
      )}

      <AppPagination
        // A página da URL, não a dos dados: com `keepPreviousData` os dados antigos ficam na tela até a nova chegar,
        // e o destaque tem de ir para a página clicada na hora.
        page={search.page ?? 1}
        totalPages={pagination.totalPages}
        onPageChange={() => undefined}
        renderPage={(page, children, props) => (
          <Link
            to="/"
            search={applyPatch(search, { page })}
            // Sem `exact`, o Router marca como ativo todo link cuja busca é subconjunto da atual — a página 1 (sem
            // `page`) casaria sempre — e sobrescreve o `aria-current` que o AppPagination já passa em `props`.
            activeOptions={{ exact: true }}
            resetScroll={false}
            preload="intent"
            onClick={scrollToCatalog}
            {...props}
          >
            {children}
          </Link>
        )}
      />
    </div>
  );
}
