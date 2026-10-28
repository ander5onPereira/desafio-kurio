import { useState } from "react";
import { AppFormField, AppInput } from "@/components/ui";
import { ENS_SUFFIXES, joinEnsName, splitEnsName, type EnsSuffix } from "../ens";
import { FieldSelect } from "./FieldSelect";

export interface EnsNameFieldProps {
  label?: string;
  value: string;
  onChange: (fullName: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * EnsNameField — "Nome ENS": seletor de sufixo + campo de texto (Figma). O valor externo é sempre o
 * nome completo; o sufixo escolhido é lembrado localmente enquanto o nome está vazio.
 */
export function EnsNameField({
  label = "Nome ENS",
  value,
  onChange,
  error,
  required,
  disabled,
  placeholder = "seu-nome",
}: EnsNameFieldProps) {
  const [localSuffix, setLocalSuffix] = useState<EnsSuffix>(splitEnsName(value).suffix);
  const parsed = splitEnsName(value);
  // Com valor preenchido, o sufixo vem do próprio valor (ex.: formulário resetado com outro ENS).
  const suffix = value ? parsed.suffix : localSuffix;
  const name = value ? parsed.name : "";

  return (
    <AppFormField label={label} required={required} error={error}>
      {(field) => (
        <div className="flex gap-2">
          <FieldSelect
            aria-label="Sufixo do nome ENS"
            wrapperClassName="w-auto shrink-0"
            className="min-w-28"
            value={suffix}
            disabled={disabled}
            onChange={(event) => {
              const next = event.target.value as EnsSuffix;
              setLocalSuffix(next);
              onChange(joinEnsName(name, next));
            }}
          >
            {ENS_SUFFIXES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </FieldSelect>
          <AppInput
            {...field}
            value={name}
            disabled={disabled}
            placeholder={placeholder}
            autoComplete="off"
            invalid={Boolean(error)}
            onChange={(event) => onChange(joinEnsName(event.target.value, suffix))}
          />
        </div>
      )}
    </AppFormField>
  );
}
