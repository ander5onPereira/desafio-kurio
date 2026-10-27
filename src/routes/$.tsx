import { createFileRoute } from "@tanstack/react-router";
import { RouteNotFound } from "@/components/shared/RouteStates";

// Rota "pega-tudo": qualquer caminho inexistente cai no 404 do Kurio.
export const Route = createFileRoute("/$")({
  head: () => ({ meta: [{ title: "Página não encontrada · Kurio" }] }),
  component: RouteNotFound,
});
