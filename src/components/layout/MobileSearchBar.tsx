import { useId, type FormEvent } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { AppBadge } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface MobileSearchBarProps {
  /** Valor inicial (a URL é a fonte da verdade: passe o `q` atual). Use `key={q}` para ressincronizar. */
  defaultValue?: string;
  /** A cada digitação (o chamador faz o debounce com `useDebouncedValue`). */
  onChange?: (value: string) => void;
  /** Ao enviar (Enter/botão de busca do teclado). */
  onSearch?: (value: string) => void;
  /** Abre o drawer de filtros (montado pelo catálogo). */
  onOpenFilters: () => void;
  /** Quantidade de filtros ativos (aparece na bolinha do botão). */
  activeFilters?: number;
  placeholder?: string;
  className?: string;
}

/**
 * MobileSearchBar — barra "Explorar coleções" + botão de filtros do Início mobile.
 * Só aparece no mobile (`md:hidden`). O campo é `type="search"` dentro de um `<form role="search">`.
 */
export function MobileSearchBar({
  defaultValue,
  onChange,
  onSearch,
  onOpenFilters,
  activeFilters = 0,
  placeholder = "Explorar coleções",
  className,
}: MobileSearchBarProps) {
  const inputId = useId();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("q");
    onSearch?.(typeof value === "string" ? value.trim() : "");
  }

  return (
    <div className={cn("flex items-center gap-3 md:hidden", className)}>
      <form role="search" onSubmit={handleSubmit} className="relative flex-1">
        <label htmlFor={inputId} className="sr-only">
          Buscar NFTs
        </label>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-primary" aria-hidden="true" />
        <input
          id={inputId}
          name="q"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          defaultValue={defaultValue}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          className="h-12 w-full rounded-lg bg-card pl-12 pr-4 text-sm font-semibold text-foreground placeholder:text-subtle-foreground focus-visible:outline-2 focus-visible:outline-ring"
        />
      </form>
      <button
        type="button"
        onClick={onOpenFilters}
        aria-label={activeFilters > 0 ? `Filtros, ${activeFilters} ativos` : "Filtros"}
        className="relative inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-pressed"
      >
        <SlidersHorizontal className="size-5" aria-hidden="true" />
        {activeFilters > 0 && (
          <AppBadge variant="count" aria-hidden="true" className="absolute -right-1 -top-1 border-2 border-background bg-foreground text-background">
            {activeFilters}
          </AppBadge>
        )}
      </button>
    </div>
  );
}
