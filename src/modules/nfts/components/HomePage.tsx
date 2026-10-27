import { useState } from "react";
import { AppDrawer, AppSelect, AppTabs, AppTabsContent, AppButton } from "@/components/ui";
import { Container } from "@/components/layout/Container";
import { MobileSearchBar } from "@/components/layout/MobileSearchBar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { NFT_SORTS } from "@/contracts";
import { useNftList } from "../hooks";
import { applyPatch, normalizeSearch, toApiQuery, type CatalogSearch } from "../searchParams";
import { CatalogFilters } from "./CatalogFilters";
import { CatalogResults } from "./CatalogResults";
import { CatalogToolbar, sortOptions } from "./CatalogToolbar";
import { JournalSection, PromoBanners } from "./EditorialSections";
import { HeroCarousel } from "./HeroCarousel";
import { SpotlightCard } from "./SpotlightCard";
import { useSearchInput } from "./useSearchInput";

export interface HomePageProps {
  /** Estado do catálogo (vem da URL). */
  search: CatalogSearch;
  /** Grava o novo estado na URL. `replace` evita empilhar histórico a cada tecla da busca. */
  onSearchChange: (next: CatalogSearch, options?: { replace?: boolean }) => void;
}

function countActiveFilters(search: CatalogSearch) {
  return (
    (search.q ? 1 : 0) +
    (search.collection?.length ?? 0) +
    (search.network?.length ?? 0) +
    (search.minPrice || search.maxPrice ? 1 : 0)
  );
}

/**
 * Início: hero + catálogo (sidebar de filtros no desktop, drawer no tablet/mobile) + banners +
 * "Diário da Cunhagem". A URL é a fonte da verdade: este componente só LÊ `search` e pede mudanças
 * via `onSearchChange` (toda mudança de filtro/ordem/aba/busca reinicia a página — `applyPatch`).
 */
export function HomePage({ search, onSearchChange }: HomePageProps) {
  const isMdUp = useMediaQuery("(min-width: 768px)");
  const isLgUp = useMediaQuery("(min-width: 1024px)");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const query = useNftList(toApiQuery(search));
  const facets = query.data?.facets;

  const change = (patch: Partial<CatalogSearch>, options?: { replace?: boolean }) =>
    onSearchChange(applyPatch(search, patch), options);
  // "Limpar filtros" remove busca, coleção, rede e preço; mantém aba e ordenação.
  const clearFilters = () => onSearchChange(normalizeSearch({ sort: search.sort, tab: search.tab }));

  const mobileSearch = useSearchInput(search.q, (q) => change({ q: q || undefined }, { replace: true }));
  const activeFilters = countActiveFilters(search);

  return (
    <Container className="flex flex-col gap-12 py-4 md:gap-16 md:py-8">
      <h1 className="sr-only">Kurio — marketplace de NFTs</h1>

      {!isMdUp && (
        <MobileSearchBar
          key={mobileSearch.resetKey}
          defaultValue={mobileSearch.defaultValue}
          onChange={mobileSearch.onChange}
          onSearch={mobileSearch.onSubmit}
          onOpenFilters={() => setFiltersOpen(true)}
          activeFilters={activeFilters}
        />
      )}

      <HeroCarousel />

      <section id="catalogo" aria-label="Catálogo de NFTs" className="flex scroll-mt-24 gap-12">
        {isLgUp && (
          <aside aria-label="Filtros" className="flex w-76 shrink-0 flex-col gap-8">
            <CatalogFilters facets={facets} search={search} onChange={change} onClear={clearFilters} />
            <SpotlightCard />
          </aside>
        )}

        <AppTabs
          value={search.tab ?? "all"}
          onValueChange={(tab) => change({ tab: tab as CatalogSearch["tab"] })}
          className="flex min-w-0 flex-1 flex-col gap-6"
        >
          <CatalogToolbar
            search={search}
            onChange={change}
            showFiltersButton={isMdUp && !isLgUp}
            showSort={isMdUp}
            onOpenFilters={() => setFiltersOpen(true)}
            activeFilters={activeFilters}
          />
          <AppTabsContent value={search.tab ?? "all"} className="pt-0">
            <CatalogResults query={query} search={search} onClear={clearFilters} />
          </AppTabsContent>
        </AppTabs>
      </section>

      <PromoBanners />
      <JournalSection />

      {!isLgUp && (
        <AppDrawer
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          side={isMdUp ? "left" : "bottom"}
          title="Filtros"
          description="Refine o catálogo por coleção, preço e rede."
          footer={
            <AppButton className="w-full" onClick={() => setFiltersOpen(false)}>
              Ver resultados
            </AppButton>
          }
        >
          <div className="flex flex-col gap-6">
            {!isMdUp && (
              <div className="flex flex-col gap-2">
                <p id="mobile-sort-label" className="text-base font-semibold text-foreground">
                  Ordenar por
                </p>
                <AppSelect
                  aria-labelledby="mobile-sort-label"
                  value={search.sort ?? "recent"}
                  onValueChange={(value) => change({ sort: value as (typeof NFT_SORTS)[number] })}
                  options={sortOptions}
                />
              </div>
            )}
            <CatalogFilters
              facets={facets}
              search={search}
              onChange={change}
              onClear={clearFilters}
              showSearch={isMdUp}
              className="bg-transparent p-0"
            />
          </div>
        </AppDrawer>
      )}
    </Container>
  );
}
