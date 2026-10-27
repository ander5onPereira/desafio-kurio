import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { fieldClasses } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface FieldSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  /** Classes do wrapper (ex.: `w-auto` para um select de largura própria). */
  wrapperClassName?: string;
}

/**
 * FieldSelect — <select> nativo com a aparência dos campos do Kurio (chevron do Figma).
 * Nativo de propósito: teclado, leitor de tela e seleção em mobile funcionam sem armadilhas.
 * Use dentro de um AppFormField (label visível).
 */
export const FieldSelect = forwardRef<HTMLSelectElement, FieldSelectProps>(
  ({ className, wrapperClassName, invalid, children, ...props }, ref) => (
    <div className={cn("relative w-full", wrapperClassName)}>
      <select
        ref={ref}
        aria-invalid={invalid || props["aria-invalid"] || undefined}
        className={cn(fieldClasses, "h-10 appearance-none pr-9", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  ),
);
FieldSelect.displayName = "FieldSelect";
