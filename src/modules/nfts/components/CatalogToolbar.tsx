import { SlidersHorizontal } from "lucide-react";
import { NFT_SORTS, NFT_SORT_LABELS, NFT_TABS, NFT_TAB_LABELS } from "@/contracts";
import { AppButton, AppSelect, AppTabsList, AppTabsTrigger } from "@/components/ui";
import type { CatalogSearch } from "../searchParams";

export const sortOptions = NFT_SORTS.map((value) => ({ value, label: NFT_SORT_LABELS[value] }));

interface CatalogToolbarProps {
  search: CatalogSearch;
  onChange: (patch: Partial<CatalogSearch>) => void;
  showFiltersButton: boolean;
  showSort: boolean;
  onOpenFilters: () => void;
  activeFilters: number;
}

/**
 * Abas (Todos / Novos / Em alta) + "Ordenar por". As abas controlam o painel de resultados
 * (AppTabsContent em CatalogSection). Trocar aba ou ordem reinicia a paginação (applyPatch).
 */
export function CatalogToolbar({ search, onChange, showFiltersButton, showSort, onOpenFilters, activeFilters }: CatalogToolbarProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <AppTabsList aria-label="Seções do catálogo" className="gap-5 border-b-0 md:gap-6">
        {NFT_TABS.map((tab) => (
          <AppTabsTrigger key={tab} value={tab} className="py-2 text-xs md:text-sm">
            {NFT_TAB_LABELS[tab]}
          </AppTabsTrigger>
        ))}
      </AppTabsList>

      {(showFiltersButton || showSort) && (
        <div className="flex items-center gap-4">
          {showFiltersButton && (
            <AppButton
              variant="outline"
              size="sm"
              leftIcon={<SlidersHorizontal className="size-4" aria-hidden="true" />}
              onClick={onOpenFilters}
            >
              Filtros{activeFilters > 0 ? ` (${activeFilters})` : ""}
            </AppButton>
          )}
          {showSort && (
            <div className="flex items-center gap-2 text-sm text-foreground">
              <span aria-hidden="true">Ordenar por:</span>
              <AppSelect
                variant="inline"
                aria-label="Ordenar por"
                value={search.sort ?? "recent"}
                onValueChange={(value) => onChange({ sort: value as (typeof NFT_SORTS)[number] })}
                options={sortOptions}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
