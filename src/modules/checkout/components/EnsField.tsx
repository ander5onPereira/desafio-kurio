import { AppInput, AppSelect } from "@/components/ui";
import type { FormFieldControlProps } from "@/components/ui";

const SUFFIXES = [".kurio.eth", ".eth"] as const;

/** "nova.kurio.eth" → { name: "nova", suffix: ".kurio.eth" }. Sem sufixo conhecido, assume ".eth". */
export function splitEns(value: string): { name: string; suffix: string } {
  const suffix = SUFFIXES.find((candidate) => value.endsWith(candidate));
  return suffix ? { name: value.slice(0, -suffix.length), suffix } : { name: value, suffix: ".eth" };
}

interface EnsFieldProps {
  value: string;
  onChange: (next: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  field: FormFieldControlProps;
  disabled?: boolean;
}

/**
 * Campo "Nome ENS": seletor de sufixo + nome. O valor do formulário é o nome COMPLETO
 * ("nova.eth"), que é o que o contrato espera.
 */
export function EnsField({ value, onChange, onBlur, invalid, field, disabled }: EnsFieldProps) {
  const { name, suffix } = splitEns(value);
  return (
    <div className="flex gap-2">
      <AppSelect
        aria-label="Sufixo do nome ENS"
        value={suffix}
        onValueChange={(next) => onChange(name ? `${name}${next}` : "")}
        options={SUFFIXES.map((option) => ({ value: option, label: option }))}
        disabled={disabled}
        className="w-36 shrink-0"
      />
      <AppInput
        {...field}
        value={name}
        onChange={(event) => onChange(event.target.value ? `${event.target.value}${suffix}` : "")}
        onBlur={onBlur}
        invalid={invalid}
        disabled={disabled}
        autoComplete="off"
        placeholder="nome"
      />
    </div>
  );
}
