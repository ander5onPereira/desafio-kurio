import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * AppSkeleton — bloco de carregamento com SHIMMER (classe `skeleton-shimmer` em styles/shimmer.css).
 * Regra: dê dimensões FIXAS (`h-*`/`w-*`/`aspect-*`) idênticas às do conteúdo real, para não
 * gerar deslocamento de layout (CLS). Com `prefers-reduced-motion` o bloco fica estático.
 * É decorativo (`aria-hidden`): o anúncio de "carregando" fica no AppSkeletonGroup.
 */
export function AppSkeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn("skeleton-shimmer rounded-md", className)} {...props} />;
}

interface AppSkeletonGroupProps {
  /** Texto para leitores de tela (ex.: "Carregando catálogo"). */
  label?: string;
  className?: string;
  children: ReactNode;
}

/** Agrupa skeletons de uma região e a marca como ocupada (`aria-busy`) com um anúncio textual. */
export function AppSkeletonGroup({ label = "Carregando conteúdo", className, children }: AppSkeletonGroupProps) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
