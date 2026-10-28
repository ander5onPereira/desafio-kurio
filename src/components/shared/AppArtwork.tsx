import type { ImgHTMLAttributes } from "react";
import type { Artwork } from "@/contracts";
import { cn } from "@/lib/utils";

export interface AppArtworkProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "alt" | "width" | "height"> {
  artwork: Artwork;
  /**
   * `thumb` → arquivo de 128 px (miniaturas, carrinho, recibo);
   * `full` → 128w + 250w com srcset (cards, hero, detalhe). Arte-fonte tem 250 px: não há upscale.
   */
  variant?: "thumb" | "full";
  sizes?: string;
  /** Imagem do LCP (hero/detalhe): carrega já, com prioridade alta. As demais são lazy. */
  priority?: boolean;
  decorative?: boolean;
}

const NATIVE = 250;
const THUMB = 128;

/**
 * AppArtwork — arte do NFT em AVIF/WebP (`public/img/artwork-<chave>-<128|250>.<avif|webp>`).
 * `width`/`height` explícitos reservam o espaço (CLS ≈ 0); o tamanho real vem da classe (`w-full aspect-square`).
 */
export function AppArtwork({ artwork, variant = "full", sizes, priority, decorative, className, ...props }: AppArtworkProps) {
  const base = `/img/artwork-${artwork.key}`;
  const dimension = variant === "thumb" ? THUMB : NATIVE;
  const srcSet = (ext: "avif" | "webp") =>
    variant === "thumb" ? `${base}-${THUMB}.${ext}` : `${base}-${THUMB}.${ext} ${THUMB}w, ${base}-${NATIVE}.${ext} ${NATIVE}w`;
  const sizesAttr = variant === "thumb" ? undefined : (sizes ?? `${NATIVE}px`);

  return (
    <picture>
      <source type="image/avif" srcSet={srcSet("avif")} sizes={sizesAttr} />
      <source type="image/webp" srcSet={srcSet("webp")} sizes={sizesAttr} />
      <img
        src={`${base}-${dimension}.webp`}
        alt={decorative ? "" : artwork.alt}
        width={dimension}
        height={dimension}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        className={cn("aspect-square object-cover", className)}
        {...props}
      />
    </picture>
  );
}
