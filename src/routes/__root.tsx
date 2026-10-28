import { HeadContent, Outlet, createRootRouteWithContext, useRouterState } from "@tanstack/react-router";
import { LazyMotion, domAnimation } from "motion/react";
import { AppToaster } from "@/components/ui";
import { AppLiveRegion } from "@/components/shared";
import {
  BottomNav,
  ConnectionIndicator,
  Footer,
  Header,
  OfflineBanner,
  RouteAnnouncer,
  SearchDialog,
  getChrome,
} from "@/components/layout";
import { useRealtime } from "@/modules/realtime";
import { cn } from "@/lib/utils";
import type { RouterContext } from "@/router-context";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

/**
 * Shell global. As páginas NÃO renderizam <main> (o root já fornece `<main id="conteudo">`);
 * cada página deve ter um único <h1> e definir `head: () => ({ meta: [{ title: "… · Kurio" }] })`.
 */
function RootLayout() {
  useRealtime();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const chrome = getChrome(pathname);

  return (
    <LazyMotion features={domAnimation} strict>
      <HeadContent />
      <a
        href="#conteudo"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform focus:translate-y-0"
      >
        Ir para o conteúdo
      </a>
      <OfflineBanner />
      <div className="flex min-h-dvh flex-col">
        <Header />
        <main id="conteudo" tabIndex={-1} className={cn("flex-1 outline-none", chrome.bottomNav && "pb-28 md:pb-0")}>
          <Outlet />
        </main>
        {chrome.footer && <Footer />}
      </div>
      {chrome.bottomNav && <BottomNav />}
      <ConnectionIndicator />
      <SearchDialog />
      <AppToaster />
      <AppLiveRegion />
      <RouteAnnouncer />
    </LazyMotion>
  );
}
