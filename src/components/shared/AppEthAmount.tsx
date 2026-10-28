import { cva, type VariantProps } from "class-variance-authority";
import { formatEth } from "@/lib/money";
import { cn } from "@/lib/utils";

const amountVariants = cva("tabular-nums", {
  variants: {
    tone: {
      primary: "font-bold text-primary",
      foreground: "font-normal text-foreground",
      muted: "font-normal text-muted-foreground",
    },
    size: { sm: "text-sm", md: "text-base", lg: "text-lg", xl: "text-2xl" },
  },
  defaultVariants: { tone: "primary", size: "md" },
});

export interface AppEthAmountProps extends VariantProps<typeof amountVariants> {
  value: string;
  compareAt?: string | null;
  unit?: boolean;
  prefix?: string;
  minFraction?: number;
  maxFraction?: number;
  className?: string;
}

/**
 * AppEthAmount — exibe valores em ETH com a formatação do Figma (mín. 2 casas, sem zeros supérfluos).
 * O preço antigo é lido como "Preço anterior: …" por leitores de tela (a tachadura é só visual).
 */
export function AppEthAmount({ value, compareAt, unit = true, prefix, tone, size, minFraction, maxFraction, className }: AppEthAmountProps) {
  const format = (amount: string) => formatEth(amount, { minFraction, maxFraction });
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={amountVariants({ tone, size })}>
        {prefix ? `${prefix} ` : ""}
        {format(value)}
        {unit ? " ETH" : ""}
      </span>
      {compareAt && (
        <>
          <span className="sr-only">Preço anterior:</span>
          <del className="text-[0.85em] font-normal text-muted-foreground">
            {format(compareAt)}
            {unit ? " ETH" : ""}
          </del>
        </>
      )}
    </span>
  );
}
