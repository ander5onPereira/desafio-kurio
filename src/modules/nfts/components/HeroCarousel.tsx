import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AppButton, AppCarousel, AppError, AppSkeleton, AppSkeletonGroup } from "@/components/ui";
import { AppArtwork } from "@/components/shared";
import { useFeatured } from "../hooks";

/**
 * Hero do Início: carrossel com pontos (sem autoplay). Desktop: texto à esquerda e arte à direita;
 * mobile: cartão compacto. O <h1> da página é oculto (cada slide usa <h2>), assim a página tem
 * um único h1 independentemente do slide ativo.
 */
export function HeroCarousel() {
  const { data, isPending, isError, error, refetch, isFetching } = useFeatured();

  if (isPending) {
    return (
      <AppSkeletonGroup label="Carregando destaques">
        {/* Altura = slide (min-h-88/80/112) + faixa dos pontos (28 px): o catálogo não desloca quando o hero chega. */}
        <AppSkeleton className="h-95 w-full rounded-2xl md:h-87 md:rounded-md lg:h-119" />
      </AppSkeletonGroup>
    );
  }

  if (isError) {
    return <AppError compact error={error} title="Não foi possível carregar os destaques" onRetry={() => void refetch()} isRetrying={isFetching} />;
  }

  return (
    <AppCarousel label="Destaques da Kurio" options={{ loop: true }}>
      {data.hero.map((slide, index) => {
        const [main, secondary] = slide.images;
        return (
          <div
            key={slide.id}
            className="flex min-h-88 items-center justify-between gap-4 overflow-hidden rounded-2xl bg-card p-5 md:min-h-80 md:gap-8 md:rounded-none md:bg-transparent md:p-0 lg:min-h-112 lg:gap-12 lg:px-12"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-3 md:gap-5">
              <p className="text-xs font-semibold text-foreground">{slide.eyebrow}</p>
              <h2 className="text-xl font-bold uppercase leading-tight text-foreground md:text-3xl md:leading-snug lg:text-4xl">{slide.title}</h2>
              <p className="max-w-md text-xs leading-5 text-muted-foreground md:text-xs md:leading-6">{slide.description}</p>
              <div>
                <AppButton asChild variant="primary" size="md" className="hidden uppercase md:inline-flex">
                  <Link to="/" hash="catalogo" search={(prev) => prev}>
                    {slide.ctaLabel}
                  </Link>
                </AppButton>
                <Link
                  to="/"
                  hash="catalogo"
                  search={(prev) => prev}
                  className="inline-flex items-center gap-2 text-xs font-bold uppercase text-accent-foreground md:hidden"
                >
                  {slide.ctaLabel}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
            {main && (
              <div className="relative shrink-0">
                <AppArtwork
                  artwork={main}
                  variant="full"
                  priority={index === 0}
                  sizes="(min-width: 1024px) 448px, (min-width: 768px) 320px, 128px"
                  className="size-32 rounded-xl object-cover md:size-80 md:rounded-2xl lg:size-112"
                />
                {secondary && (
                  <AppArtwork
                    artwork={secondary}
                    variant="thumb"
                    decorative
                    className="absolute -bottom-3 -left-6 size-14 rounded-xl border-4 border-card object-cover md:hidden"
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </AppCarousel>
  );
}
