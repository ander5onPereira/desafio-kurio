import { forwardRef, useId, type ComponentPropsWithoutRef, type ComponentRef, type ReactNode } from "react";
import { Checkbox } from "radix-ui";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AppCheckboxProps extends Omit<ComponentPropsWithoutRef<typeof Checkbox.Root>, "children"> {
  /** Texto do rótulo (clicável). Sem `label`, passe `aria-label`. */
  label?: ReactNode;
  invalid?: boolean;
}

/**
 * AppCheckbox — caixa de seleção redonda com contorno de destaque (como "Usar outra carteira?" do Figma).
 * O estado marcado mostra ícone de check (não só cor).
 */
export const AppCheckbox = forwardRef<ComponentRef<typeof Checkbox.Root>, AppCheckboxProps>(
  ({ className, label, invalid, id, ...props }, ref) => {
    const reactId = useId();
    const inputId = id ?? `checkbox-${reactId}`;
    return (
      <div className="inline-flex items-center gap-2">
        <Checkbox.Root
          ref={ref}
          id={inputId}
          aria-invalid={invalid || undefined}
          className={cn(
            "inline-flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-primary text-primary-foreground transition-colors data-[state=checked]:bg-primary disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger",
            className,
          )}
          {...props}
        >
          <Checkbox.Indicator>
            <Check className="size-3" strokeWidth={4} aria-hidden="true" />
          </Checkbox.Indicator>
        </Checkbox.Root>
        {label && (
          <label htmlFor={inputId} className="cursor-pointer text-sm text-foreground">
            {label}
          </label>
        )}
      </div>
    );
  },
);
AppCheckbox.displayName = "AppCheckbox";
