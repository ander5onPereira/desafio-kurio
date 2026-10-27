import { useId, useState, type ReactNode } from "react";
import { Check, Search } from "lucide-react";
import { NETWORK_LABELS, type NetworkId, type NftFacets } from "@/contracts";
import { formatEth } from "@/lib/money";
import { cn } from "@/lib/utils";
import { AppButton, AppFormField, AppInput, AppSkeleton, AppSkeletonGroup, AppSlider } from "@/components/ui";
import { hasActiveFilters, type CatalogSearch } from "../searchParams";
import { useSearchInput } from "./useSearchInput";

interface CatalogFiltersProps {
  facets: NftFacets | undefined;
  search: CatalogSearch;
  onChange: (patch: Partial<CatalogSearch>, options?: { replace?: boolean }) => void;
  onClear: () => void;
  /** Mostra o campo de busca (no mobile ele fica na MobileSearchBar). */
  showSearch?: boolean;
  /** Chamado depois de aplicar uma escolha (fecha o drawer). */
  onDone?: () => void;
  className?: string;
}

/*
  O slider trabalha em "centésimos de ETH" inteiros (0.02 ETH → 2): assim ele nunca produz erro de
  ponto flutuante. Os valores que vão para a URL/API continuam strings decimais ("0.02").
*/
const toUnits = (eth: string) => Math.round(Number(eth) * 100);
const fromUnits = (units: number) => (units / 100).toFixed(2);

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-base font-semibold text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function OptionButton({
  label,
  count,
  pressed,
  onClick,
}: {
  label: string;
  count: number;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={pressed}
        onClick={onClick}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xs py-2 pl-3 text-left text-sm transition-colors hover:text-accent-foreground",
          pressed ? "font-semibold text-accent-foreground" : "text-muted-foreground",
        )}
      >
        <span className="flex items-center gap-2">
          <Check className={cn("size-3.5", !pressed && "invisible")} aria-hidden="true" />
          {label}
        </span>
        <span className={pressed ? "font-semibold" : undefined}>({count})</span>
      </button>
    </li>
  );
}

const toggle = <T extends string>(list: readonly T[] | undefined, value: T): T[] => {
  const current = list ?? [];
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
};

/** Faixa de preço: o slider só altera o estado local; a URL muda ao clicar em "Aplicar". */
function PriceRangeFilter({
  bounds,
  minPrice,
  maxPrice,
  onApply,
}: {
  bounds: { min: number; max: number };
  minPrice: string | undefined;
  maxPrice: string | undefined;
  onApply: (range: { minPrice?: string; maxPrice?: string }) => void;
}) {
  const [range, setRange] = useState<[number, number]>([
    Math.max(bounds.min, minPrice ? toUnits(minPrice) : bounds.min),
    Math.min(bounds.max, maxPrice ? toUnits(maxPrice) : bounds.max),
  ]);
  const label = `Preço: ${formatEth(fromUnits(range[0])).replace(".", ",")} - ${formatEth(fromUnits(range[1])).replace(".", ",")} ETH`;

  return (
    <div className="flex flex-col gap-3">
      <AppSlider
        value={range}
        onValueChange={setRange}
        min={bounds.min}
        max={bounds.max}
        step={1}
        minLabel="Preço mínimo em ETH"
        maxLabel="Preço máximo em ETH"
        className="px-1"
      />
      <p className="text-xs text-foreground">{label}</p>
      <AppButton
        size="sm"
        className="self-start"
        onClick={() =>
          onApply({
            minPrice: range[0] > bounds.min ? fromUnits(range[0]) : undefined,
            maxPrice: range[1] < bounds.max ? fromUnits(range[1]) : undefined,
          })
        }
      >
        Aplicar
      </AppButton>
    </div>
  );
}

/** Conteúdo de filtros (sidebar no desktop, drawer no tablet/mobile). */
export function CatalogFilters({ facets, search, onChange, onClear, showSearch = true, onDone, className }: CatalogFiltersProps) {
  const searchId = useId();
  const input = useSearchInput(search.q, (q) => onChange({ q: q || undefined }, { replace: true }));
  const bounds = facets ? { min: toUnits(facets.priceRange.min), max: Math.max(toUnits(facets.priceRange.max), toUnits(facets.priceRange.min) + 1) } : null;

  return (
    <div className={cn("flex flex-col gap-8 rounded-md bg-card p-5", className)}>
      {showSearch && (
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get("q");
            input.onSubmit(typeof value === "string" ? value : "");
          }}
        >
          <AppFormField label="Buscar NFTs" hideLabel htmlFor={searchId}>
            {(field) => (
              <AppInput
                {...field}
                key={input.resetKey}
                name="q"
                type="search"
                autoComplete="off"
                defaultValue={input.defaultValue}
                onChange={(event) => input.onChange(event.target.value)}
                placeholder="Buscar NFTs"
                leftIcon={<Search className="size-4" />}
              />
            )}
          </AppFormField>
        </form>
      )}

      {!facets ? (
        <AppSkeletonGroup label="Carregando filtros" className="flex flex-col gap-8">
          <AppSkeleton className="h-60 w-full" />
          <AppSkeleton className="h-24 w-full" />
          <AppSkeleton className="h-24 w-full" />
        </AppSkeletonGroup>
      ) : (
        <>
          <FilterSection title="Coleções">
            <ul className="flex flex-col">
              {facets.collections.map((collection) => (
                <OptionButton
                  key={collection.id}
                  label={collection.name}
                  count={collection.count}
                  pressed={search.collection?.includes(collection.id) ?? false}
                  onClick={() => {
                    onChange({ collection: toggle(search.collection, collection.id) });
                    onDone?.();
                  }}
                />
              ))}
            </ul>
          </FilterSection>

          {bounds && (
            <FilterSection title="Faixa de preço">
              <PriceRangeFilter
                // Remonta quando a URL muda por fora (voltar do histórico, limpar filtros).
                key={`${search.minPrice ?? ""}-${search.maxPrice ?? ""}-${bounds.min}-${bounds.max}`}
                bounds={bounds}
                minPrice={search.minPrice}
                maxPrice={search.maxPrice}
                onApply={(range) => {
                  onChange(range);
                  onDone?.();
                }}
              />
            </FilterSection>
          )}

          <FilterSection title="Rede">
            <ul className="flex flex-col">
              {facets.networks.map((network) => (
                <OptionButton
                  key={network.id}
                  label={NETWORK_LABELS[network.id as NetworkId] ?? network.name}
                  count={network.count}
                  pressed={search.network?.includes(network.id) ?? false}
                  onClick={() => {
                    onChange({ network: toggle(search.network, network.id) });
                    onDone?.();
                  }}
                />
              ))}
            </ul>
          </FilterSection>
        </>
      )}

      {hasActiveFilters(search) && (
        <AppButton
          variant="outline"
          size="sm"
          onClick={() => {
            onClear();
            onDone?.();
          }}
        >
          Limpar filtros
        </AppButton>
      )}
    </div>
  );
}
