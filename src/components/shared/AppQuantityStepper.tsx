import { useId } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AppQuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  /** Máximo (estoque/limite). Ao atingir, exibe "Máx. N" em texto (não só desabilitado). */
  max?: number;
  label: string;
  size?: "sm" | "md";
  disabled?: boolean;
  showLimit?: boolean;
  className?: string;
}

const circle = {
  sm: "size-5 [&_svg]:size-3",
  md: "size-8 [&_svg]:size-4",
} as const;

/**
 * AppQuantityStepper — controle − / + circular do Figma. Quantidades são sempre inteiras.
 * `role="group"` com rótulo; o valor é um <output> (anunciado de forma educada ao mudar).
 */
export function AppQuantityStepper({ value, onChange, min = 1, max, label, size = "md", disabled, showLimit = true, className }: AppQuantityStepperProps) {
  const limitId = useId();
  const atMax = max !== undefined && value >= max;
  const atMin = value <= min;
  const buttonClass = cn(
    "inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-pressed disabled:bg-card disabled:text-subtle-foreground disabled:opacity-100",
    circle[size],
  );

  return (
    <div role="group" aria-label={`Quantidade de ${label}`} className={cn("inline-flex items-center gap-3", className)}>
      <button
        type="button"
        className={buttonClass}
        disabled={disabled || atMin}
        aria-label={`Diminuir quantidade de ${label}`}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus aria-hidden="true" strokeWidth={3} />
      </button>
      <output aria-live="polite" className={cn("min-w-5 text-center tabular-nums", size === "sm" ? "text-sm" : "text-base")}>
        {value}
      </output>
      <button
        type="button"
        className={buttonClass}
        disabled={disabled || atMax}
        aria-label={`Aumentar quantidade de ${label}`}
        aria-describedby={atMax && showLimit ? limitId : undefined}
        onClick={() => onChange(max === undefined ? value + 1 : Math.min(max, value + 1))}
      >
        <Plus aria-hidden="true" strokeWidth={3} />
      </button>
      {atMax && showLimit && (
        <span id={limitId} className="text-xs text-muted-foreground">
          Máx. {max}
        </span>
      )}
    </div>
  );
}
