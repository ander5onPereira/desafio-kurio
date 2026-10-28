import { Children, useCallback, useSyncExternalStore, type ReactNode } from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { EmblaOptionsType } from "embla-carousel";
import { cn } from "@/lib/utils";

export interface AppCarouselProps {
  /** Cada filho vira um slide. Defina a largura do slide com `slideClassName` (ex.: "basis-1/2 md:basis-1/5"). */
  children: ReactNode;
  /** Rótulo da região (obrigatório para acessibilidade). Ex.: "Mais desta coleção". */
  label: string;
  slideClassName?: string;
  options?: EmblaOptionsType;
  showDots?: boolean;
  className?: string;
}

/**
 * AppCarousel — carrossel (Embla) com pontos do Figma. Acessível: região com rótulo, cada slide
 * é um grupo "N de M" e os pontos são botões. Setas esquerda/direita navegam quando o carrossel tem foco.
 * Sem autoplay (evita movimento não solicitado).
 */
export function AppCarousel({ children, label, slideClassName, options, showDots = true, className }: AppCarouselProps) {
  const [viewportRef, embla] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps", ...options });
  const slides = Children.toArray(children);

  // Snapshot primitivo ("total:selecionado") mantém a leitura estável para o useSyncExternalStore.
  const snapshot = useSyncExternalStore(
    useCallback(
      (onChange: () => void) => {
        embla?.on("select", onChange).on("reInit", onChange);
        return () => {
          embla?.off("select", onChange).off("reInit", onChange);
        };
      },
      [embla],
    ),
    () => (embla ? `${embla.scrollSnapList().length}:${embla.selectedScrollSnap()}` : "0:0"),
    () => "0:0",
  );
  const [countText, selectedText] = snapshot.split(":");
  // Antes de o embla inicializar usa o nº de slides: reserva a faixa dos pontos e evita deslocamento de layout.
  const count = embla ? Number(countText) : slides.length;
  const selected = Number(selectedText);

  return (
    <div role="region" aria-roledescription="carrossel" aria-label={label} className={className}>
      <div ref={viewportRef} className="overflow-hidden">
        <div className="-ml-4 flex touch-pan-y">
          {slides.map((slide, index) => (
            <div
              key={index}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} de ${slides.length}`}
              className={cn("min-w-0 shrink-0 grow-0 basis-full pl-4", slideClassName)}
            >
              {slide}
            </div>
          ))}
        </div>
      </div>
      {showDots && count > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2" role="group" aria-label={`Navegação de ${label}`}>
          {Array.from({ length: count }, (_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Ir para o slide ${index + 1}`}
              aria-current={index === selected ? "true" : undefined}
              onClick={() => embla?.scrollTo(index)}
              className={cn(
                "size-3 rounded-full border border-primary transition-colors",
                index === selected ? "bg-primary" : "bg-transparent hover:bg-primary/40",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
