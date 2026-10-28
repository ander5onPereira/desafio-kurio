import { Star } from "lucide-react";
import type { NftDetail } from "@/contracts";
import { NETWORK_LABELS } from "@/contracts";
import { AppEmpty, AppError, AppSkeleton, AppSkeletonGroup, AppTabs, AppTabsContent, AppTabsList, AppTabsTrigger } from "@/components/ui";
import { useNftReviews } from "../hooks";

export function Stars({ rating, className }: { rating: number; className?: string }) {
  const filled = Math.round(rating);
  return (
    <span className={className}>
      <span className="sr-only">Nota {rating.toFixed(1).replace(".", ",")} de 5</span>
      <span aria-hidden="true" className="inline-flex gap-0.5">
        {Array.from({ length: 5 }, (_, index) => (
          <Star key={index} className={index < filled ? "size-3.5 fill-primary text-primary" : "size-3.5 text-border"} />
        ))}
      </span>
    </span>
  );
}

const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

function ReviewsPanel({ nftId }: { nftId: string }) {
  const { data, isPending, isError, error, refetch, isFetching } = useNftReviews(nftId);

  if (isPending) {
    return (
      <AppSkeletonGroup label="Carregando avaliações" className="flex flex-col gap-4">
        <AppSkeleton className="h-20 w-full" />
        <AppSkeleton className="h-20 w-full" />
      </AppSkeletonGroup>
    );
  }
  if (isError) {
    return <AppError compact error={error} title="Não foi possível carregar as avaliações" onRetry={() => void refetch()} isRetrying={isFetching} />;
  }
  if (data.items.length === 0) {
    return <AppEmpty title="Ainda não há avaliações" description="Seja a primeira pessoa a avaliar este NFT depois da compra." />;
  }

  return (
    <ul className="flex flex-col gap-4">
      {data.items.map((review) => (
        <li key={review.id} className="rounded-md bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-foreground">{review.author}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Stars rating={review.rating} />
              <time dateTime={review.createdAt}>{dateFormat.format(new Date(review.createdAt))}</time>
            </div>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{review.comment}</p>
        </li>
      ))}
    </ul>
  );
}

/** Abas "Detalhes do NFT" e "Avaliações de colecionadores (N)". As avaliações só são buscadas ao abrir a aba. */
export function DetailTabs({ nft }: { nft: NftDetail }) {
  return (
    <AppTabs defaultValue="details">
      <AppTabsList aria-label="Informações do NFT">
        <AppTabsTrigger value="details">Detalhes do NFT</AppTabsTrigger>
        <AppTabsTrigger value="reviews">Avaliações de colecionadores ({nft.rating.count})</AppTabsTrigger>
      </AppTabsList>

      <AppTabsContent value="details" className="flex flex-col gap-4 text-sm leading-6 text-muted-foreground">
        {nft.about.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
        <dl className="flex flex-col gap-4">
          <div>
            <dt className="font-bold text-foreground">Rede:</dt>
            <dd>
              Cunhado na {NETWORK_LABELS[nft.network]} com procedência imutável e metadados armazenados no IPFS.
            </dd>
          </div>
          <div>
            <dt className="font-bold text-foreground">Contrato:</dt>
            <dd>
              {nft.contract.address} · Contrato inteligente {nft.contract.standard} verificado.
            </dd>
          </div>
          <div>
            <dt className="font-bold text-foreground">Direitos autorais:</dt>
            <dd>
              Direitos autorais do criador: {nft.contract.royaltyPercent}% nas vendas secundárias, pagos automaticamente pelos
              mercados compatíveis.
            </dd>
          </div>
        </dl>
      </AppTabsContent>

      <AppTabsContent value="reviews">
        <ReviewsPanel nftId={nft.id} />
      </AppTabsContent>
    </AppTabs>
  );
}
