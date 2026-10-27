import type { ReactNode } from "react";
import { announce } from "@/components/shared/AppLiveRegion";
import { cn } from "@/lib/utils";
import { AppBadge } from "./AppBadge";
import { AppTooltip } from "./AppTooltip";

export interface AppComingSoonProps {
  children: ReactNode;
  /** Mostra o selo visível "Em breve" ao lado do texto. */
  badge?: boolean;
  /** Texto da dica ao focar/passar o mouse. */
  tooltip?: string;
  className?: string;
}

/**
 * AppComingSoon — para ações/links FORA DE ESCOPO (Criadores, Aprenda, Atividade, Google/Facebook…).
 * Renderiza um botão `aria-disabled` (continua focável para o leitor de tela achar), com dica "Em breve"
 * e texto oculto "(em breve)". Ao ativar, NÃO faz nada de funcional: só anuncia que não está disponível.
 * Nunca aparenta sucesso.
 */
export function AppComingSoon({ children, badge, tooltip = "Em breve", className }: AppComingSoonProps) {
  return (
    <AppTooltip content={tooltip}>
      <button
        type="button"
        aria-disabled="true"
        data-coming-soon=""
        onClick={() => announce("Esta área ainda não está disponível.")}
        className={cn("inline-flex cursor-not-allowed items-center gap-2 text-left opacity-60", className)}
      >
        {children}
        <span className="sr-only"> (em breve)</span>
        {badge && <AppBadge variant="soon">Em breve</AppBadge>}
      </button>
    </AppTooltip>
  );
}
