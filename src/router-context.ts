import type { QueryClient } from "@tanstack/react-query";

/** Contexto disponível em loaders e `beforeLoad` de todas as rotas. */
export interface RouterContext {
  queryClient: QueryClient;
}
