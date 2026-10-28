import { useSyncExternalStore } from "react";

/**
 * Observa uma media query (ex.: "(min-width: 768px)"). Sem SSR: o valor inicial já vem do navegador.
 * Prefira classes responsivas do Tailwind; use este hook só quando a ESTRUTURA muda (ex.: Dialog x tela cheia).
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const useIsDesktop = () => useMediaQuery("(min-width: 768px)");
