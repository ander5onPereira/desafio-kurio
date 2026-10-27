import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * AppBadge — selos.
 *  - `rare`: retângulo "RARO" dos cards;  - `soon`: "Em breve" (ações fora de escopo);
 *  - `count`: bolinha do carrinho;         - `success|danger|warning|info`: estados (sempre com texto).
 */
const badgeVariants = cva("inline-flex items-center justify-center font-semibold uppercase leading-none", {
  variants: {
    variant: {
      rare: "rounded-xs bg-primary px-2 py-1.5 text-xs text-primary-foreground",
      soon: "rounded-full border border-subtle-foreground px-2 py-1 text-[0.625rem] tracking-wide text-muted-foreground",
      count: "min-w-4 rounded-full bg-primary px-1 py-0.5 text-[0.625rem] text-primary-foreground",
      neutral: "rounded-sm border border-border bg-card px-2 py-1 text-xs text-muted-foreground",
      success: "rounded-sm bg-success-surface px-2 py-1 text-xs text-success",
      danger: "rounded-sm bg-danger-surface px-2 py-1 text-xs text-danger",
      warning: "rounded-sm bg-warning-surface px-2 py-1 text-xs text-warning",
      info: "rounded-sm bg-info-surface px-2 py-1 text-xs text-info",
    },
  },
  defaultVariants: { variant: "neutral" },
});

export interface AppBadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function AppBadge({ className, variant, ...props }: AppBadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
