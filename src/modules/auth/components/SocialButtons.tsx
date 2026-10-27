import type { ReactNode } from "react";
import { AppComingSoon } from "@/components/ui";

/**
 * "Ou continue com" — Google e Facebook estão FORA DE ESCOPO: aparecem desabilitados com
 * "Em breve" e nunca simulam sucesso. Os glifos usam `currentColor` (regra: nada de cor fora
 * dos tokens) — desvio documentado: as cores de marca do Figma não são reproduzidas.
 */
function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill="currentColor">
      <path d="M12.2 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.2 14.8 2.2 12.2 2.2 7 2.2 2.8 6.4 2.8 11.8s4.2 9.6 9.4 9.6c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6z" />
    </svg>
  );
}

function FacebookGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill="currentColor">
      <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.800v2.200H8v3h2.600V21z" />
    </svg>
  );
}

function SocialButton({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <AppComingSoon
      badge
      className="h-10 w-full justify-center rounded-sm border border-border text-xs font-semibold text-muted-foreground"
    >
      {icon}
      {children}
    </AppComingSoon>
  );
}

export function SocialButtons() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-xs text-foreground">
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
        <span>Ou continue com</span>
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>
      <SocialButton icon={<GoogleGlyph />}>Continuar com Google</SocialButton>
      <SocialButton icon={<FacebookGlyph />}>Continuar com Facebook</SocialButton>
    </div>
  );
}
