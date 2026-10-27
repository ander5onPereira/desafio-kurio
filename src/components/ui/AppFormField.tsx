import { useId, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/** Props de acessibilidade que o campo filho deve receber (ids ligados ao label e às mensagens). */
export interface FormFieldControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
}

export interface AppFormFieldProps {
  label: ReactNode;
  /** Mostra o asterisco (cor de destaque) e marca o campo com aria-required. */
  required?: boolean;
  /** Texto de ajuda sob o campo. */
  helper?: ReactNode;
  /** Mensagem de erro (ex.: de React Hook Form ou fieldErrors da API). Exibe ícone + texto. */
  error?: string;
  className?: string;
  /** Renderiza visualmente apenas para leitores de tela (label curto em campos óbvios). */
  hideLabel?: boolean;
  /**
   * O filho pode ser um elemento (você passa `id` por conta própria via `htmlFor`) ou, o
   * recomendado, uma função que recebe as props de acessibilidade para espalhar no campo:
   * `{(field) => <AppInput {...register("email")} {...field} />}`
   */
  children: ReactNode | ((field: FormFieldControlProps) => ReactNode);
  htmlFor?: string;
}

/**
 * AppFormField — label + campo + ajuda + erro, com `aria-describedby`/`aria-invalid` ligados.
 * Erros usam ícone + texto (nunca só cor) e `role="alert"` para serem anunciados.
 */
export function AppFormField({ label, required, helper, error, className, hideLabel, children, htmlFor }: AppFormFieldProps) {
  const reactId = useId();
  const id = htmlFor ?? `field-${reactId}`;
  const helperId = helper ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;

  const control: FormFieldControlProps = {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
    "aria-required": required ? true : undefined,
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className={cn("text-sm text-foreground", hideLabel && "sr-only")}>
        {label}
        {required && (
          <span className="ml-0.5 text-accent-foreground" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {typeof children === "function" ? children(control) : children}
      {helper && !error && (
        <p id={helperId} className="text-xs text-muted-foreground">
          {helper}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-xs text-danger">
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
