import { useId } from "react";
import type { NftEdition } from "@/contracts";
import { AppRadioChip, AppRadioGroup } from "@/components/ui";

interface EditionPickerProps {
  editions: readonly NftEdition[];
  value: string;
  onChange: (editionId: string) => void;
}

/**
 * Edição (1/1, 1/10, 1/50, ABERTA) como grupo de opções exclusivas (setas movem a seleção).
 * Edição esgotada fica desabilitada e traz o texto "Esgotada" — o estado nunca depende só de cor.
 */
export function EditionPicker({ editions, value, onChange }: EditionPickerProps) {
  const labelId = useId();
  return (
    <div className="flex flex-col gap-2">
      <p id={labelId} className="text-sm font-bold text-foreground">
        Edição:
      </p>
      <AppRadioGroup aria-labelledby={labelId} value={value} onValueChange={onChange} className="flex flex-wrap gap-2">
        {editions.map((edition) => {
          const soldOut = edition.available < 1;
          return (
            <AppRadioChip key={edition.id} value={edition.id} disabled={soldOut}>
              {edition.label}
              {soldOut && <span className="ml-1 text-[0.625rem] uppercase no-underline">Esgotada</span>}
            </AppRadioChip>
          );
        })}
      </AppRadioGroup>
    </div>
  );
}
