import { createFileRoute } from "@tanstack/react-router";
import { RouteNotFound } from "@/components/shared/RouteStates";

export const Route = createFileRoute("/$")({
  head: () => ({ meta: [{ title: "Página não encontrada · Kurio" }] }),
  component: RouteNotFound,
});
