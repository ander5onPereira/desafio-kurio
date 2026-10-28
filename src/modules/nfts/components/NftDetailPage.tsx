import { useEffect, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft, Link2, Mail, PackageSearch, Share2, Star } from "lucide-react";
import type { NftDetail } from "@/contracts";
import { hasErrorCode } from "@/lib/errors";
import {
  AppBadge,
  AppBreadcrumb,
  AppButton,
  AppCarousel,
  AppComingSoon,
  AppEmpty,
  AppError,
  AppSkeleton,
  AppSkeletonGroup,
} from "@/components/ui";
import { AppEthAmount } from "@/components/shared";
import { Container } from "@/components/layout/Container";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { FavoriteButton } from "@/modules/favorites";
import { useNftDetail, useRelatedNfts } from "../hooks";
import { DetailTabs, Stars } from "./DetailTabs";
import { EditionPicker } from "./EditionPicker";
import { NftCard, NftCardSkeleton } from "./NftCard";
import { NftGallery } from "./NftGallery";
import { PurchasePanel, maxPurchasable } from "./PurchasePanel";

export function NftNotFound() {
  return (
    <Container className="py-16">
      <AppEmpty
        icon={<PackageSearch className="size-10" />}
        title="NFT não encontrado"
        description="Esse NFT não existe ou foi removido do mercado. Confira o endereço ou explore o catálogo."
        action={
          <AppButton asChild>
            <Link to="/" hash="catalogo">
              Explorar o catálogo
            </Link>
          </AppButton>
        }
      />
    </Container>
  );
}

/**
 * Esqueleto com as dimensões do detalhe (galeria quadrada, título, preço, textos). Ocupa ao menos a
 * altura da tela: o conteúdo carregado (abas e relacionados) é bem mais alto e, sem isso, o rodapé
 * visível durante o carregamento seria empurrado para baixo (deslocamento de layout).
 */
function NftDetailSkeleton() {
  return (
    <Container className="min-h-dvh py-6 md:py-8">
      <AppSkeletonGroup label="Carregando NFT" className="flex flex-col gap-8">
        <AppSkeleton className="hidden h-5 w-40 md:block" />
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex gap-4">
            <div className="hidden w-22 shrink-0 flex-col gap-4 md:flex">
              {Array.from({ length: 4 }, (_, index) => (
                <AppSkeleton key={index} className="aspect-square w-full" />
              ))}
            </div>
            <AppSkeleton className="aspect-square flex-1 rounded-2xl md:rounded-md" />
          </div>
          <div className="flex flex-col gap-5">
            <AppSkeleton className="h-9 w-3/4" />
            <AppSkeleton className="h-6 w-1/3" />
            <AppSkeleton className="h-20 w-full" />
            <AppSkeleton className="h-8 w-2/3" />
            <AppSkeleton className="h-12 w-full" />
            <AppSkeleton className="h-24 w-full" />
          </div>
        </div>
      </AppSkeletonGroup>
    </Container>
  );
}

function RelatedNfts({ nftId }: { nftId: string }) {
  const { data, isPending, isError, error, refetch, isFetching } = useRelatedNfts(nftId);

  return (
    <section aria-labelledby="related-title" className="flex flex-col gap-4">
      <h2 id="related-title" className="border-b border-border pb-3 text-base font-bold text-accent-foreground">
        Mais desta coleção
      </h2>
      {isPending ? (
        <AppSkeletonGroup label="Carregando NFTs relacionados">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className={index > 1 ? "hidden md:block" : undefined}>
                <NftCardSkeleton />
              </div>
            ))}
          </div>
        </AppSkeletonGroup>
      ) : isError ? (
        <AppError compact error={error} title="Não foi possível carregar os NFTs relacionados" onRetry={() => void refetch()} isRetrying={isFetching} />
      ) : data.items.length === 0 ? null : (
        <AppCarousel label="Mais desta coleção" slideClassName="basis-1/2 md:basis-1/3 lg:basis-1/5">
          {data.items.map((nft) => (
            <NftCard key={nft.id} nft={nft} />
          ))}
        </AppCarousel>
      )}
    </section>
  );
}

function NftDetailContent({ nft }: { nft: NftDetail }) {
  const router = useRouter();
  const isMdUp = useMediaQuery("(min-width: 768px)");
  const [editionId, setEditionId] = useState(nft.defaultEditionId);
  const [requested, setRequested] = useState(1);

  // O título da aba acompanha o NFT (sincroniza com um sistema externo: o documento).
  useEffect(() => {
    document.title = `${nft.name} · Kurio`;
  }, [nft.name]);

  const edition = nft.editions.find((item) => item.id === editionId) ?? nft.editions[0];
  if (!edition) return <NftNotFound />;

  // A quantidade nunca passa do que é comprável agora (estoque pode mudar em tempo real).
  const max = maxPurchasable(nft, edition);
  const quantity = Math.max(1, Math.min(requested, Math.max(max, 1)));

  const info = (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold leading-tight text-foreground md:text-3xl">{nft.name}</h1>
          {!isMdUp && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary px-2.5 py-1 text-xs font-bold text-foreground">
              <Star className="size-3.5 fill-primary text-primary" aria-hidden="true" />
              <span className="sr-only">Nota</span>
              {nft.rating.average.toFixed(1)}
              <span className="font-normal text-muted-foreground">({nft.rating.count})</span>
            </span>
          )}
        </div>
        {isMdUp && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <AppEthAmount value={edition.price} compareAt={edition.compareAtPrice} size="xl" />
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Stars rating={nft.rating.average} />
              {nft.rating.count} avaliações de colecionadores
            </p>
          </div>
        )}
        {nft.rare && (
          <div>
            <AppBadge variant="rare">Raro</AppBadge>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold text-foreground">Sobre este NFT:</p>
        <p className="text-sm leading-6 text-muted-foreground">{nft.description}</p>
      </div>

      <EditionPicker editions={nft.editions} value={edition.id} onChange={setEditionId} />

      {isMdUp && (
        <PurchasePanel nft={nft} edition={edition} quantity={quantity} onQuantityChange={setRequested} layout="inline" />
      )}

      <dl className="flex flex-col gap-2 text-sm text-muted-foreground">
        <div className="flex gap-1">
          <dt>ID do token:</dt>
          <dd>#{nft.tokenId}</dd>
        </div>
        <div className="flex gap-1">
          <dt>Coleção:</dt>
          <dd>{nft.collection.name}</dd>
        </div>
        <div className="flex gap-1">
          <dt>Atributos:</dt>
          <dd>{nft.attributes.join(", ")}</dd>
        </div>
      </dl>

      <div className="hidden items-center gap-3 text-sm md:flex">
        <span className="font-bold text-foreground">Compartilhar este NFT:</span>
        <AppComingSoon tooltip="Compartilhar — em breve">
          <Share2 className="size-4" aria-hidden="true" />
          <span className="sr-only">Compartilhar nas redes</span>
        </AppComingSoon>
        <AppComingSoon tooltip="Enviar por e-mail — em breve">
          <Mail className="size-4" aria-hidden="true" />
          <span className="sr-only">Compartilhar por e-mail</span>
        </AppComingSoon>
        <AppComingSoon tooltip="Copiar link — em breve">
          <Link2 className="size-4" aria-hidden="true" />
          <span className="sr-only">Copiar link</span>
        </AppComingSoon>
      </div>
    </div>
  );

  return (
    <>
      {!isMdUp && (
        <div className="flex items-center justify-between px-4 pb-3 pt-4">
          <button
            type="button"
            aria-label="Voltar"
            onClick={() => router.history.back()}
            className="inline-flex size-10 items-center justify-center rounded-full bg-card text-accent-foreground transition-colors hover:bg-border"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <FavoriteButton nft={nft} className="size-10 rounded-full" />
        </div>
      )}

      <Container className={isMdUp ? "flex flex-col gap-16 py-8" : "flex flex-col gap-8 pb-52"}>
        {isMdUp && (
          <AppBreadcrumb
            items={[
              { label: "Início", to: "/" },
              { label: "Mercado", to: "/", hash: "catalogo" },
              { label: nft.name },
            ]}
          />
        )}

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
          <NftGallery images={nft.gallery} name={nft.name} />
          {info}
        </div>

        <DetailTabs nft={nft} />
        <RelatedNfts nftId={nft.id} />
      </Container>

      {!isMdUp && (
        <PurchasePanel nft={nft} edition={edition} quantity={quantity} onQuantityChange={setRequested} layout="bar" />
      )}
    </>
  );
}

export function NftDetailPage({ nftId }: { nftId: string }) {
  const { data, isPending, isError, error, refetch, isFetching } = useNftDetail(nftId);

  if (isPending) return <NftDetailSkeleton />;
  if (isError) {
    if (hasErrorCode(error, "NOT_FOUND")) return <NftNotFound />;
    return (
      <Container className="py-12">
        <h1 className="sr-only">Erro ao carregar o NFT</h1>
        <AppError error={error} title="Não foi possível carregar este NFT" onRetry={() => void refetch()} isRetrying={isFetching} />
      </Container>
    );
  }
  // `key` reinicia edição/quantidade ao navegar de um NFT para outro (ex.: "Mais desta coleção").
  return <NftDetailContent key={data.id} nft={data} />;
}
