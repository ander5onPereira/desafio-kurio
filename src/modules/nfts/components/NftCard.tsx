import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, Loader2, ShoppingCart } from "lucide-react";
import type { NftSummary } from "@/contracts";
import { cn } from "@/lib/utils";
import { AppBadge } from "@/components/ui";
import { AppArtwork, AppEthAmount } from "@/components/shared";
import { FavoriteButton } from "@/modules/favorites";
import { prefetchNftDetail } from "../hooks";
import { useQuickAdd } from "./useQuickAdd";

interface NftCardProps {
  nft: NftSummary;
  /** Primeiras imagens da página (acima da dobra) carregam já. */
  priority?: boolean;
  className?: string;
}

const actionClass =
  "inline-flex size-9 items-center justify-center rounded-md bg-background/90 text-foreground transition-colors hover:bg-border disabled:opacity-60 aria-disabled:opacity-60";

/**
 * NftCard — card do catálogo. UM alvo principal (o nome é o link "esticado" sobre o card);
 * as ações (carrinho, favorito, ver) ficam acima dele. No desktop as ações aparecem no hover
 * OU no foco do teclado; no mobile só o coração (como no Figma).
 */
export function NftCard({ nft, priority, className }: NftCardProps) {
  const queryClient = useQueryClient();
  const { quickAdd, pendingId } = useQuickAdd();
  const soldOut = nft.available < 1;
  const warm = () => prefetchNftDetail(queryClient, nft.id);

  return (
    <article className={cn("group relative flex flex-col", className)} onMouseEnter={warm} onFocus={warm}>
      <div className="relative rounded-md bg-card p-3 md:p-4">
        {/* A arte é decorativa aqui: o nome do NFT (link) já descreve o card. */}
        <AppArtwork
          artwork={nft.image}
          decorative
          priority={priority}
          sizes="(min-width: 1024px) 240px, 45vw"
          className="w-full rounded-xl"
        />
        {nft.rare && <AppBadge variant="rare" className="absolute left-0 top-4 rounded-l-none md:top-5">Raro</AppBadge>}

        {/* Mobile: coração no canto. */}
        <FavoriteButton nft={nft} className="absolute right-5 top-5 z-10 bg-background/80 md:hidden" />

        {/* Desktop: ações no hover/foco. */}
        <div className="absolute inset-x-0 bottom-7 z-10 hidden items-center justify-center gap-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 md:flex">
          <button
            type="button"
            className={actionClass}
            aria-label={soldOut ? `${nft.name} esgotado` : `Adicionar ${nft.name} ao carrinho`}
            aria-disabled={soldOut || undefined}
            disabled={pendingId === nft.id}
            onClick={() => {
              if (!soldOut) void quickAdd(nft);
            }}
          >
            {pendingId === nft.id ? (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <ShoppingCart className="size-4" aria-hidden="true" />
            )}
          </button>
          <FavoriteButton nft={nft} className="bg-background/90" />
          <Link to="/nft/$nftId" params={{ nftId: nft.id }} className={actionClass} aria-label={`Ver detalhes de ${nft.name}`}>
            <Eye className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="mt-3 flex flex-col">
        <h3 className="text-sm leading-5 text-foreground">
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            className="rounded-xs after:absolute after:inset-0 after:z-0"
          >
            {nft.name}
          </Link>
        </h3>
        {soldOut ? (
          <p className="text-base font-bold leading-6 text-muted-foreground">Esgotado</p>
        ) : (
          <AppEthAmount value={nft.price} compareAt={nft.compareAtPrice} size="md" className="leading-6" />
        )}
      </div>
    </article>
  );
}

/** Esqueleto com as MESMAS dimensões do NftCard (evita deslocamento de layout). */
export function NftCardSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col">
      <div className="rounded-md bg-card p-3 md:p-4">
        <div className="skeleton-shimmer aspect-square w-full rounded-xl" />
      </div>
      <div className="mt-3 flex flex-col">
        <div className="flex h-5 items-center">
          <div className="skeleton-shimmer h-3.5 w-2/3 rounded-sm" />
        </div>
        <div className="flex h-6 items-center">
          <div className="skeleton-shimmer h-4 w-1/3 rounded-sm" />
        </div>
      </div>
    </div>
  );
}
