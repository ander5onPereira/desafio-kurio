import type { ReactNode } from "react";
import { Link, useRouter, type LinkProps } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MobileTopBarProps {
  title: ReactNode;
  /** Voltar para uma rota específica. Sem isso nem `onBack`, volta no histórico. */
  backTo?: LinkProps["to"];
  onBack?: () => void;
  /** Conteúdo à direita (ex.: favorito). Reserva o espaço para manter o título centralizado. */
  trailing?: ReactNode;
  className?: string;
}

const circle =
  "inline-flex size-10 items-center justify-center rounded-full bg-card text-accent-foreground transition-colors hover:bg-border";

/**
 * MobileTopBar — barra superior das telas internas no mobile (Carrinho, Pagamento…): botão de voltar
 * circular + título centralizado. Some no desktop (`md:hidden`); lá a página usa o próprio <h1>.
 */
export function MobileTopBar({ title, backTo, onBack, trailing, className }: MobileTopBarProps) {
  const router = useRouter();
  return (
    <div className={cn("grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 px-4 pb-3 pt-4 md:hidden", className)}>
      {backTo ? (
        <Link to={backTo} aria-label="Voltar" className={circle}>
          <ChevronLeft className="size-5" aria-hidden="true" />
        </Link>
      ) : (
        <button type="button" aria-label="Voltar" onClick={onBack ?? (() => router.history.back())} className={circle}>
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
      )}
      {/* Sem truncar: o título inteiro aparece (fonte menor e quebra em até 2 linhas em telas estreitas). */}
      <h1 className="text-balance text-center text-lg font-bold leading-tight text-foreground min-[400px]:text-xl">{title}</h1>
      <div className="flex justify-end">{trailing}</div>
    </div>
  );
}
