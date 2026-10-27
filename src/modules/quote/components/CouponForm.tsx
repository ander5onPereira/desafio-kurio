import { useState, type FormEvent } from "react";
import { Tag, X } from "lucide-react";
import { AppButton, AppFormField, AppInput } from "@/components/ui";
import { useApplyCoupon, useRemoveCoupon } from "../hooks";
import { quoteSettings, useQuoteSettings } from "../settings";

/**
 * Cupom promocional (carrinho e pagamento). Só vira "cupom atual" se a API aceitar; erro (inválido/
 * expirado) aparece sob o campo e a cotação anterior continua na tela. Remover recalcula o resumo.
 */
export function CouponForm({ className }: { className?: string }) {
  const settings = useQuoteSettings();
  const apply = useApplyCoupon();
  const removeCoupon = useRemoveCoupon();
  const [code, setCode] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    apply.mutate(trimmed, { onSuccess: () => setCode("") });
  };

  return (
    <div className={className}>
      {settings.notice && (
        <p role="status" className="mb-3 flex items-start gap-2 rounded-sm bg-warning-surface px-3 py-2 text-xs text-warning">
          <span className="flex-1">{settings.notice}</span>
          <button type="button" aria-label="Dispensar aviso" onClick={quoteSettings.dismissNotice} className="rounded-xs">
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </p>
      )}

      {settings.couponCode ? (
        <div role="status" className="flex items-center justify-between gap-3 rounded-sm border border-border bg-card px-3 py-2 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <Tag className="size-4 shrink-0 text-accent-foreground" aria-hidden="true" />
            <span className="truncate">
              Cupom <strong className="text-accent-foreground">{settings.couponCode}</strong> aplicado
            </span>
          </span>
          <AppButton variant="link" size="sm" onClick={removeCoupon} aria-label={`Remover cupom ${settings.couponCode}`}>
            Remover
          </AppButton>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <AppFormField label="Código promocional" error={apply.error?.message}>
            {(field) => (
              <div className="flex">
                <AppInput
                  {...field}
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value);
                    if (apply.isError) apply.reset();
                  }}
                  placeholder="Digite o código promocional..."
                  autoComplete="off"
                  autoCapitalize="characters"
                  className="rounded-r-none"
                />
                <AppButton type="submit" isLoading={apply.isPending} disabled={!code.trim()} className="rounded-l-none">
                  Aplicar
                </AppButton>
              </div>
            )}
          </AppFormField>
        </form>
      )}
    </div>
  );
}
