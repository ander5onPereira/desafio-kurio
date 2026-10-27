import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { fieldClasses } from "./AppInput";

export interface AppTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

/** AppTextarea — campo de texto multilinha (ex.: "Observação do colecionador"). */
export const AppTextarea = forwardRef<HTMLTextAreaElement, AppTextareaProps>(
  ({ className, invalid, rows = 5, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || props["aria-invalid"] || undefined}
      className={cn(fieldClasses, "min-h-24 resize-y py-2", className)}
      {...props}
    />
  ),
);
AppTextarea.displayName = "AppTextarea";
