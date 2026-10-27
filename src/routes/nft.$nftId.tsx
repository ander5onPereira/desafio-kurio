import { createFileRoute } from "@tanstack/react-router";
import { NftDetailPage } from "@/modules/nfts/components/NftDetailPage";
import { nftDetailOptions } from "@/modules/nfts/hooks";

export const Route = createFileRoute("/nft/$nftId")({
  // Aquece o cache sem bloquear: acesso direto, NFT inexistente (404) e erro são tratados no componente.
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(nftDetailOptions(params.nftId));
  },
  head: () => ({ meta: [{ title: "Detalhes do NFT · Kurio" }] }),
  component: NftDetailRoute,
});

function NftDetailRoute() {
  const { nftId } = Route.useParams();
  return <NftDetailPage nftId={nftId} />;
}
