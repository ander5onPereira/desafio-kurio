import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AppButton — botão base do Kurio.
 * Variantes: primary, secondary, outline, ghost, link, danger. Tamanhos: xs, sm, md, lg.
 * Suporta `isLoading` (desabilita + aria-busy), ícones laterais, `iconOnly` e `asChild`
 * (para renderizar um <Link> do Router com o visual do botão).
 * Ícone sem texto exige `aria-label` (quem usa é responsável).
 */
export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-sm font-semibold transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed",
        secondary: "border border-border bg-card text-foreground hover:bg-border",
        outline: "border border-foreground/70 bg-transparent text-foreground hover:bg-card",
        ghost: "bg-transparent text-foreground hover:bg-card",
        link: "h-auto bg-transparent p-0 text-accent-foreground underline-offset-4 hover:underline",
        danger: "border border-danger bg-danger-surface text-danger hover:bg-danger/20",
      },
      size: {
        xs: "h-7 px-2.5 text-xs",
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 rounded-lg px-6 text-base",
      },
      iconOnly: { true: "px-0", false: "" },
    },
    compoundVariants: [
      { iconOnly: true, size: "xs", class: "w-7" },
      { iconOnly: true, size: "sm", class: "w-8" },
      { iconOnly: true, size: "md", class: "w-10" },
      { iconOnly: true, size: "lg", class: "w-12" },
    ],
    defaultVariants: { variant: "primary", size: "md", iconOnly: false },
  },
);

export interface AppButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(
  (
    { className, variant, size, iconOnly, asChild, isLoading, leftIcon, rightIcon, children, disabled, type, ...props },
    ref,
  ) => {
    const classes = cn(buttonVariants({ variant, size, iconOnly }), className);

    // Com asChild o filho é quem renderiza (ex.: <Link>); não injetamos ícones nem spinner.
    if (asChild) {
      return (
        <Slot.Root ref={ref} className={classes} aria-disabled={disabled || isLoading || undefined} {...props}>
          {children}
        </Slot.Root>
      );
    }

    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={classes}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  },
);
AppButton.displayName = "AppButton";
