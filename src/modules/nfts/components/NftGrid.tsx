import type { NftSummary } from "@/contracts";
import { AppSkeletonGroup } from "@/components/ui";
import { cn } from "@/lib/utils";
import { NftCard, NftCardSkeleton } from "./NftCard";

interface NftGridProps {
  items: readonly NftSummary[];
  label: string;
  priorityCount?: number;
  className?: string;
}

const gridClass =
  "grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 md:gap-x-8 md:gap-y-10 [&>li:nth-child(even)]:mt-10 md:[&>li:nth-child(even)]:mt-0";

export function NftGrid({ items, label, priorityCount = 0, className }: NftGridProps) {
  return (
    <ul aria-label={label} className={cn(gridClass, className)}>
      {items.map((nft, index) => (
        <li key={nft.id}>
          <NftCard nft={nft} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  );
}

export function NftGridSkeleton({ count = 9, label = "Carregando NFTs" }: { count?: number; label?: string }) {
  return (
    <AppSkeletonGroup label={label}>
      <div className={gridClass}>
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="[&:nth-child(even)]:mt-10 md:[&:nth-child(even)]:mt-0">
            <NftCardSkeleton />
          </div>
        ))}
      </div>
    </AppSkeletonGroup>
  );
}
