import { AppArtwork, AppEthAmount } from "@/components/shared";
import type { Artwork } from "@/contracts";

export interface CheckoutLine {
  key: string;
  name: string;
  tokenId: string;
  editionLabel: string;
  quantity: number;
  lineTotal: string;
  image: Artwork;
}

export function CheckoutItems({ lines }: { lines: readonly CheckoutLine[] }) {
  return (
    <ul aria-label="Seus NFTs" className="flex flex-col gap-2">
      {lines.map((line) => (
        <li key={line.key} className="flex items-center gap-3 rounded-sm bg-card pr-3">
          <AppArtwork artwork={line.image} variant="thumb" className="size-[4.375rem] shrink-0 rounded-sm" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-bold text-foreground">{line.name}</span>
            <span className="text-xs text-muted-foreground">
              ID do token: #{line.tokenId} · Edição {line.editionLabel}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            <span className="sr-only">Quantidade: </span>(x {line.quantity})
          </span>
          <AppEthAmount value={line.lineTotal} size="md" />
        </li>
      ))}
    </ul>
  );
}
