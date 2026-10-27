import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppCarousel } from "@/components/ui";
import { AppArtwork, AppEthAmount } from "@/components/shared";
import { endpoints } from "@/contracts";
import { callEndpoint } from "@/lib/api";
import { keys } from "@/lib/queryKeys";

/**
 * "Colecionadores também viram" — NFTs relacionados ao primeiro item do carrinho.
 * Usa a mesma query key do detalhe (`keys.nfts.related`), então o cache é compartilhado e o
 * realtime (`nft.updated`) atualiza preço/estoque aqui também.
 */
export function AlsoViewed({ nftId }: { nftId: string }) {
  const related = useQuery({
    queryKey: keys.nfts.related(nftId),
    queryFn: ({ signal }) => callEndpoint(endpoints.nfts.related, { params: { nftId }, signal }),
    staleTime: 60_000,
  });
  const items = related.data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="tambem-viram" className="mt-16">
      <h2 id="tambem-viram" className="border-b border-border pb-3 text-base font-bold text-accent-foreground">
        Colecionadores também viram
      </h2>
      <AppCarousel label="NFTs relacionados ao seu carrinho" slideClassName="basis-1/2 md:basis-1/3 lg:basis-1/5" className="mt-6">
        {items.map((nft) => (
          <Link key={nft.id} to="/nft/$nftId" params={{ nftId: nft.id }} className="group flex flex-col gap-2 rounded-sm">
            <span className="block rounded-sm bg-card p-1.5">
              <AppArtwork artwork={nft.image} className="w-full rounded-sm" sizes="(min-width: 1024px) 20vw, 50vw" />
            </span>
            <span className="text-sm text-foreground group-hover:text-accent-foreground">{nft.name}</span>
            <AppEthAmount value={nft.price} compareAt={nft.compareAtPrice} size="sm" />
          </Link>
        ))}
      </AppCarousel>
    </section>
  );
}
