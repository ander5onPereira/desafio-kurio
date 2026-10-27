import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { queryClient } from "@/lib/queryClient";
import { RouteError, RouteNotFound, RoutePending } from "@/components/shared/RouteStates";

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  // O cache do Query decide a frescura; o Router não guarda loader por conta própria.
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  defaultPendingComponent: RoutePending,
  defaultErrorComponent: RouteError,
  defaultNotFoundComponent: RouteNotFound,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
