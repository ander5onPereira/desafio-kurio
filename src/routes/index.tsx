import { createFileRoute } from "@tanstack/react-router";
import { keys } from "@/lib/queryKeys";
import { endpoints } from "@/contracts";
import { callEndpoint } from "@/lib/api";
import { HomePage } from "@/modules/nfts/components/HomePage";
import { nftListOptions } from "@/modules/nfts/hooks";
import { catalogSearchSchema, toApiQuery } from "@/modules/nfts/searchParams";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => catalogSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({ query: toApiQuery(search) }),
  // Aquece o cache sem bloquear a navegação: o componente mostra skeleton se ainda não chegou.
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(nftListOptions(deps.query));
    void context.queryClient.prefetchQuery({
      queryKey: keys.nfts.featured(),
      queryFn: ({ signal }) => callEndpoint(endpoints.nfts.featured, { signal }),
      staleTime: 60_000,
    });
  },
  head: () => ({ meta: [{ title: "Kurio — Seja dono do futuro da arte digital" }] }),
  component: IndexPage,
});

function IndexPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <HomePage
      search={search}
      onSearchChange={(next, options) =>
        // `search` completo (não um merge): quem chama já aplicou applyPatch.
        void navigate({ search: next, replace: options?.replace, resetScroll: false })
      }
    />
  );
}
