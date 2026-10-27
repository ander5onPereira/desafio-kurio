import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { announce } from "@/components/shared/AppLiveRegion";

/**
 * Acessibilidade de navegação SPA: quando o CAMINHO muda (não em mudança só de search/hash, para
 * não roubar o foco enquanto o usuário filtra o catálogo), move o foco para o <h1> da página e
 * anuncia o título do documento.
 */
export function RouteAnnouncer() {
  const router = useRouter();

  useEffect(() => {
    return router.subscribe("onResolved", ({ pathChanged, fromLocation }) => {
      // Sem `fromLocation` = primeira carga: não mexer no foco nem anunciar.
      if (!pathChanged || !fromLocation) return;
      requestAnimationFrame(() => {
        const heading = document.querySelector<HTMLElement>("main h1");
        if (heading) {
          heading.setAttribute("tabindex", "-1");
          heading.focus({ preventScroll: true });
        }
        if (document.title) announce(document.title);
      });
    });
  }, [router]);

  return null;
}
