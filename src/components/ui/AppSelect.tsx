import { forwardRef, type ReactNode } from "react";
import { Select } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { fieldClasses } from "./AppInput";

export interface AppSelectOption {
  /** Não pode ser string vazia (limitação do Radix). */
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

export interface AppSelectProps {
  options: readonly AppSelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  /** `field` = caixa com borda (formulários); `inline` = sem borda (ex.: "Ordenar por: …"). */
  variant?: "field" | "inline";
  invalid?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
}

/**
 * AppSelect — seleção única (Radix Select): teclado completo, typeahead, foco devolvido.
 * Para React Hook Form use `Controller` (`value`/`onValueChange`). Recebe as props de AppFormField via `{...field}`.
 */
export const AppSelect = forwardRef<HTMLButtonElement, AppSelectProps>(
  (
    { options, value, defaultValue, onValueChange, placeholder = "Selecione", variant = "field", invalid, disabled, name, className, ...aria },
    ref,
  ) => (
    <Select.Root value={value} defaultValue={defaultValue} onValueChange={onValueChange} disabled={disabled} name={name}>
      <Select.Trigger
        ref={ref}
        aria-invalid={invalid || aria["aria-invalid"] || undefined}
        className={cn(
          variant === "field"
            ? cn(fieldClasses, "inline-flex h-10 items-center justify-between gap-2 text-left data-[placeholder]:text-subtle-foreground")
            : "inline-flex items-center gap-2 rounded-sm text-sm text-foreground hover:text-accent-foreground",
          className,
        )}
        {...aria}
      >
        <Select.Value placeholder={placeholder} />
        <Select.Icon>
          <ChevronDown className="size-4 text-subtle-foreground" aria-hidden="true" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={4}
          className="z-60 max-h-72 min-w-(--radix-select-trigger-width) overflow-hidden rounded-md border border-border bg-card text-foreground shadow-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
        >
          <Select.Viewport className="p-1">
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="relative flex cursor-default select-none items-center rounded-sm py-2 pl-8 pr-3 text-sm outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-background data-[highlighted]:text-accent-foreground"
              >
                <Select.ItemIndicator className="absolute left-2">
                  <Check className="size-4" aria-hidden="true" />
                </Select.ItemIndicator>
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  ),
);
AppSelect.displayName = "AppSelect";
