import { Link } from "@tanstack/react-router";
import { AppError, AppSkeleton, AppSkeletonGroup } from "@/components/ui";
import { AppArtwork, AppEthAmount } from "@/components/shared";
import { useFeatured } from "../hooks";

export function SpotlightCard() {
  const { data, isPending, isError, error, refetch, isFetching } = useFeatured();

  if (isPending) {
    return (
      <AppSkeletonGroup label="Carregando NFT em destaque">
        <AppSkeleton className="h-84 w-full" />
      </AppSkeletonGroup>
    );
  }
  if (isError) {
    return <AppError compact error={error} title="Destaque indisponível" onRetry={() => void refetch()} isRetrying={isFetching} />;
  }

  const nft = data.spotlight;
  return (
    <section aria-labelledby="spotlight-title" className="relative overflow-hidden rounded-md bg-card">
      <div className="flex flex-col gap-1 px-5 pb-3 pt-5">
        <h2 id="spotlight-title" className="text-lg font-bold uppercase leading-tight text-accent-foreground">
          NFT em destaque
        </h2>
        <p className="text-base font-bold uppercase text-foreground">Oferta limitada</p>
      </div>
      <AppArtwork artwork={nft.image} decorative sizes="304px" className="w-full rounded-xl" />
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <Link
          to="/nft/$nftId"
          params={{ nftId: nft.id }}
          className="rounded-xs text-sm text-foreground after:absolute after:inset-0"
        >
          {nft.name}
        </Link>
        <AppEthAmount value={nft.price} compareAt={nft.compareAtPrice} size="sm" />
      </div>
    </section>
  );
}
