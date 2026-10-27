import { forwardRef, type HTMLAttributes } from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva("rounded-md bg-card text-card-foreground", {
  variants: {
    padding: { none: "", sm: "p-3", md: "p-4 md:p-6", lg: "p-6 md:p-8" },
    bordered: { true: "border border-border", false: "" },
  },
  defaultVariants: { padding: "md", bordered: false },
});

export interface AppCardProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {
  /** Renderiza o filho como card (ex.: <article>, <section>, <li>) mantendo o visual. */
  asChild?: boolean;
}

/** AppCard — superfície base (fundo `card`, sem sombra: o Figma separa planos só por cor). */
export const AppCard = forwardRef<HTMLDivElement, AppCardProps>(({ className, padding, bordered, asChild, ...props }, ref) => {
  const Comp = asChild ? Slot.Root : "div";
  return <Comp ref={ref} className={cn(cardVariants({ padding, bordered }), className)} {...props} />;
});
AppCard.displayName = "AppCard";
