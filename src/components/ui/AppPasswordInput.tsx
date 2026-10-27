import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AppInput, type AppInputProps } from "./AppInput";

/**
 * AppPasswordInput — campo de senha com botão de mostrar/ocultar (olho do Figma).
 * O botão usa `aria-pressed` e rótulo textual; o tipo do input alterna entre password e text.
 */
export const AppPasswordInput = forwardRef<HTMLInputElement, Omit<AppInputProps, "type" | "rightSlot" | "leftIcon">>(
  (props, ref) => {
    const [visible, setVisible] = useState(false);
    return (
      <AppInput
        ref={ref}
        type={visible ? "text" : "password"}
        autoComplete={props.autoComplete ?? "current-password"}
        rightSlot={
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            aria-pressed={visible}
            aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
            className="inline-flex size-9 items-center justify-center rounded-sm text-subtle-foreground transition-colors hover:text-foreground"
          >
            {visible ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}
          </button>
        }
        {...props}
      />
    );
  },
);
AppPasswordInput.displayName = "AppPasswordInput";
