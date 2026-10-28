import { useRef, useState, type KeyboardEvent } from "react";
import { ZoomIn } from "lucide-react";
import type { Artwork } from "@/contracts";
import { cn } from "@/lib/utils";
import { AppModal } from "@/components/ui";
import { AppArtwork } from "@/components/shared";

interface NftGalleryProps {
  images: readonly Artwork[];
  name: string;
}

export function NftGallery({ images, name }: NftGalleryProps) {
  const [index, setIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const thumbs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = images[index] ?? images[0];

  function move(next: number) {
    const target = (next + images.length) % images.length;
    setIndex(target);
    thumbs.current[target]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      move(index + 1);
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      move(index - 1);
    }
  }

  if (!current) return null;

  return (
    <div className="flex gap-4">
      {images.length > 1 && (
        <div
          role="group"
          aria-label={`Imagens de ${name}`}
          className="hidden w-22 shrink-0 flex-col gap-4 md:flex"
        >
          {images.map((image, position) => (
            <button
              key={position}
              ref={(element) => {
                thumbs.current[position] = element;
              }}
              type="button"
              aria-pressed={position === index}
              aria-label={`Ver imagem ${position + 1} de ${images.length}`}
              onClick={() => setIndex(position)}
              onKeyDown={onKeyDown}
              className={cn(
                "overflow-hidden rounded-md border-2 transition-colors",
                position === index ? "border-primary" : "border-transparent hover:border-border",
              )}
            >
              <AppArtwork artwork={image} variant="thumb" decorative className="size-full" />
            </button>
          ))}
        </div>
      )}

      <div className="relative flex-1 rounded-2xl bg-card p-0 md:rounded-md md:p-4">
        <AppArtwork
          artwork={current}
          priority
          sizes="(min-width: 768px) 395px, 100vw"
          className="w-full rounded-2xl md:rounded-xl"
        />
        <button
          type="button"
          onClick={() => setZoomOpen(true)}
          aria-label="Ampliar imagem"
          className="absolute right-6 top-6 hidden size-9 items-center justify-center rounded-full bg-background/80 text-foreground transition-colors hover:bg-border md:inline-flex"
        >
          <ZoomIn className="size-5" aria-hidden="true" />
        </button>
      </div>

      <AppModal
        open={zoomOpen}
        onOpenChange={setZoomOpen}
        title={`Imagem ampliada de ${name}`}
        hideTitle
        size="md"
        accentBar={false}
      >
        <AppArtwork artwork={current} priority sizes="512px" className="mx-auto w-full max-w-lg rounded-xl" />
      </AppModal>
    </div>
  );
}
