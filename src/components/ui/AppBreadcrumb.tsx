import { Fragment } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export interface AppBreadcrumbItem {
  label: string;
  /** Destino (rota tipada do Router). Omitir no último item (página atual). */
  to?: LinkProps["to"];
  params?: LinkProps["params"];
  search?: LinkProps["search"];
  hash?: string;
}

export interface AppBreadcrumbProps {
  items: readonly AppBreadcrumbItem[];
  className?: string;
}

/**
 * AppBreadcrumb — trilha "Início / Mercado / Carrinho". O último item é a página atual (`aria-current="page"`).
 */
export function AppBreadcrumb({ items, className }: AppBreadcrumbProps) {
  return (
    <nav aria-label="Trilha de navegação" className={className}>
      <ol className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              <li className="flex items-center">
                {item.to && !isLast ? (
                  <Link
                    to={item.to}
                    params={item.params}
                    search={item.search}
                    hash={item.hash}
                    className={cn("rounded-xs transition-colors hover:text-accent-foreground")}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current={isLast ? "page" : undefined}>{item.label}</span>
                )}
              </li>
              {!isLast && (
                <li aria-hidden="true" className="text-muted-foreground">
                  /
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
