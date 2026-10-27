import { forwardRef, type ComponentRef } from "react";
import { Slider } from "radix-ui";
import { cn } from "@/lib/utils";

export interface AppSliderProps {
  /** Faixa [mínimo, máximo] selecionada. */
  value: [number, number];
  onValueChange: (value: [number, number]) => void;
  /** Disparado ao soltar o polegar (ideal para consultar a API só no fim do arrasto). */
  onValueCommit?: (value: [number, number]) => void;
  min: number;
  max: number;
  step?: number;
  /** Rótulos acessíveis dos polegares. */
  minLabel?: string;
  maxLabel?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * AppSlider — faixa dupla (preço). Operar em inteiros: para ETH use "centésimos de ETH" (0.02 → 2)
 * e converta com decimal.js/string na borda; assim o slider nunca produz erro de ponto flutuante.
 * Teclado: setas movem 1 passo, PageUp/PageDown e Home/End como no padrão ARIA slider.
 */
export const AppSlider = forwardRef<ComponentRef<typeof Slider.Root>, AppSliderProps>(
  ({ value, onValueChange, onValueCommit, min, max, step = 1, minLabel = "Valor mínimo", maxLabel = "Valor máximo", disabled, className }, ref) => (
    <Slider.Root
      ref={ref}
      value={value}
      min={min}
      max={max}
      step={step}
      minStepsBetweenThumbs={0}
      disabled={disabled}
      onValueChange={(next) => next.length === 2 && onValueChange([next[0] ?? min, next[1] ?? max])}
      onValueCommit={(next) => next.length === 2 && onValueCommit?.([next[0] ?? min, next[1] ?? max])}
      className={cn("relative flex h-5 w-full touch-none select-none items-center", className)}
    >
      <Slider.Track className="relative h-0.5 grow rounded-full bg-border">
        <Slider.Range className="absolute h-full bg-primary" />
      </Slider.Track>
      <Slider.Thumb
        aria-label={minLabel}
        className="block size-3.5 rounded-full border-2 border-primary bg-primary transition-transform hover:scale-110 disabled:opacity-50"
      />
      <Slider.Thumb
        aria-label={maxLabel}
        className="block size-3.5 rounded-full border-2 border-primary bg-primary transition-transform hover:scale-110 disabled:opacity-50"
      />
    </Slider.Root>
  ),
);
AppSlider.displayName = "AppSlider";
