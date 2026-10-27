import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Classes base compartilhadas por AppInput, AppTextarea e AppSelect (mesma aparência de campo). */
export const fieldClasses =
  "w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-subtle-foreground transition-colors md:rounded-sm hover:border-subtle-foreground focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring aria-invalid:border-danger disabled:cursor-not-allowed disabled:opacity-50";

export interface AppInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Marca o campo como inválido (aria-invalid + borda de erro). O texto do erro vai no AppFormField. */
  invalid?: boolean;
  /** Ícone à esquerda (decorativo). */
  leftIcon?: ReactNode;
  /** Conteúdo à direita dentro do campo (ex.: botão de mostrar senha). */
  rightSlot?: ReactNode;
}

/**
 * AppInput — campo de texto de linha única. Sempre usar dentro de um AppFormField (label visível):
 * placeholder NUNCA substitui label.
 */
export const AppInput = forwardRef<HTMLInputElement, AppInputProps>(
  ({ className, invalid, leftIcon, rightSlot, type = "text", ...props }, ref) => {
    const input = (
      <input
        ref={ref}
        type={type}
        aria-invalid={invalid || props["aria-invalid"] || undefined}
        className={cn(fieldClasses, "h-10", leftIcon && "pl-10", rightSlot && "pr-11", className)}
        {...props}
      />
    );

    if (!leftIcon && !rightSlot) return input;

    return (
      <div className="relative w-full">
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-subtle-foreground" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        {input}
        {rightSlot && <span className="absolute inset-y-0 right-1 flex items-center">{rightSlot}</span>}
      </div>
    );
  },
);
AppInput.displayName = "AppInput";
