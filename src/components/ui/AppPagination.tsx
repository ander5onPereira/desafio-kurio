import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPageRange } from "./paginationRange";

export interface PageLinkRenderProps {
  className: string;
  "aria-label": string;
  "aria-current"?: "page";
}

export interface AppPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblings?: number;
  /**
   * Para páginas como LINKS rastreáveis (SEO, abrir em nova aba), renderize um <Link> aqui:
   * `renderPage={(p, children, props) => <Link to="/" search={...} activeOptions={{ exact: true }} {...props}>{children}</Link>}`.
   * Sem isso, cada página é um <button>.
   * Com o <Link> do TanStack Router o `activeOptions={{ exact: true }}` é obrigatório: por padrão ele marca
   * `aria-current="page"` em todo link cuja busca seja subconjunto da atual (a página 1, sem `page`, casa sempre)
   * e sobrescreve o `aria-current` de `props`.
   */
  renderPage?: (page: number, children: ReactNode, props: PageLinkRenderProps) => ReactNode;
  className?: string;
}

const itemClass =
  "inline-flex size-8 items-center justify-center rounded-sm border border-primary text-sm text-foreground transition-colors hover:bg-card aria-[current=page]:bg-primary aria-[current=page]:font-bold aria-[current=page]:text-primary-foreground";

/**
 * AppPagination — `<nav aria-label="Paginação">` com a página atual marcada por `aria-current="page"`.
 * Itens quadrados com contorno de destaque, como no Figma. Retorna null com ≤ 1 página.
 */
export function AppPagination({ page, totalPages, onPageChange, siblings = 1, renderPage, className }: AppPaginationProps) {
  if (totalPages <= 1) return null;

  const items = getPageRange(page, totalPages, siblings);
  const renderControl = (target: number, children: ReactNode, label: string, current = false) => {
    const props: PageLinkRenderProps = {
      className: itemClass,
      "aria-label": label,
      ...(current ? { "aria-current": "page" as const } : {}),
    };
    if (renderPage) return renderPage(target, children, props);
    return (
      <button type="button" onClick={() => onPageChange(target)} {...props}>
        {children}
      </button>
    );
  };

  return (
    <nav aria-label="Paginação" className={cn("flex justify-end", className)}>
      <ul className="flex flex-wrap items-center gap-2">
        {page > 1 && (
          <li>{renderControl(page - 1, <ChevronLeft className="size-4" aria-hidden="true" />, "Página anterior")}</li>
        )}
        {items.map((item) =>
          typeof item === "number" ? (
            <li key={item}>{renderControl(item, item, `Página ${item}`, item === page)}</li>
          ) : (
            <li key={item} aria-hidden="true" className="px-1 text-muted-foreground">
              …
            </li>
          ),
        )}
        {page < totalPages && (
          <li>{renderControl(page + 1, <ChevronRight className="size-4" aria-hidden="true" />, "Próxima página")}</li>
        )}
      </ul>
    </nav>
  );
}
