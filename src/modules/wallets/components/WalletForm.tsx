import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { AppButton, AppFormField, AppInput } from "@/components/ui";
import {
  NETWORK_IDS,
  NETWORK_LABELS,
  WALLET_PROVIDERS,
  WALLET_PROVIDER_LABELS,
  type Wallet,
  type WalletInput,
  type WalletRole,
} from "@/contracts";
import { applyApiFieldErrors } from "@/lib/formErrors";
import { useCreateWallet, useUpdateWallet } from "../hooks";
import { WALLET_FIELD_NAMES, walletFormSchema, walletToDefaults, type WalletFormDefaults } from "../schemas";
import { EnsNameField } from "./EnsNameField";
import { FieldSelect } from "./FieldSelect";

interface WalletFormProps {
  walletRole: WalletRole;
  wallet?: Wallet;
  defaults: WalletFormDefaults;
  locked?: boolean;
  onSaved?: (wallet: Wallet) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

/**
 * WalletForm — formulário de carteira (Perfil > Carteiras), com os 10 campos do Figma.
 * Cria (POST) ou atualiza (PUT) conforme exista `wallet`. Erros de validação da API vão para o
 * campo certo (ex.: código de indicação inválido, endereço duplicado).
 */
export function WalletForm({ walletRole, wallet, defaults, locked, onSaved, onCancel, submitLabel = "Salvar carteira" }: WalletFormProps) {
  const createWallet = useCreateWallet();
  const updateWallet = useUpdateWallet();
  const [generalError, setGeneralError] = useState<string | null>(null);

  const form = useForm<WalletInput>({
    resolver: zodResolver(walletFormSchema),
    // Travado ("igual à principal"): usa a cópia recebida em `defaults`, mesmo editando uma carteira salva.
    defaultValues: !locked && wallet ? walletToDefaults(wallet) : defaults,
    // Valida no envio: erro ao desfocar empurra o botão e o clique se perde (layout shift).
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  async function onSubmit(values: WalletInput) {
    setGeneralError(null);
    const input: WalletInput = { ...values, role: walletRole, secondaryRef: values.secondaryRef?.trim() || null };
    try {
      const saved = wallet
        ? await updateWallet.mutateAsync({ walletId: wallet.id, input })
        : await createWallet.mutateAsync(input);
      toast.success(wallet ? "Carteira atualizada." : "Carteira cadastrada.");
      reset(walletToDefaults(saved));
      onSaved?.(saved);
    } catch (failure) {
      setGeneralError(applyApiFieldErrors(failure, setError, WALLET_FIELD_NAMES));
    }
  }

  const roleLabel = walletRole === "primary" ? "principal" : "secundária";

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label={`Carteira ${roleLabel}`} className="flex flex-col gap-6">
      {generalError && (
        <p role="alert" className="rounded-md border border-danger/40 bg-danger-surface px-4 py-3 text-sm text-danger">
          {generalError}
        </p>
      )}

      <fieldset disabled={locked} className="grid min-w-0 gap-x-6 gap-y-6 border-0 p-0 md:grid-cols-2">
        <legend className="sr-only">Dados da carteira {roleLabel}</legend>

        <AppFormField label="Nome de exibição" required error={errors.displayName?.message}>
          {(field) => <AppInput {...register("displayName")} {...field} invalid={Boolean(errors.displayName)} />}
        </AppFormField>

        <AppFormField label="Apelido da carteira" required error={errors.nickname?.message}>
          {(field) => <AppInput {...register("nickname")} {...field} invalid={Boolean(errors.nickname)} />}
        </AppFormField>

        <AppFormField label="Rede" required error={errors.network?.message}>
          {(field) => (
            <FieldSelect {...register("network")} {...field} invalid={Boolean(errors.network)}>
              <option value="">Selecione uma rede</option>
              {NETWORK_IDS.map((id) => (
                <option key={id} value={id}>
                  {NETWORK_LABELS[id]}
                </option>
              ))}
            </FieldSelect>
          )}
        </AppFormField>

        <AppFormField label="Nome do perfil" required error={errors.profileName?.message}>
          {(field) => <AppInput {...register("profileName")} {...field} invalid={Boolean(errors.profileName)} />}
        </AppFormField>

        <AppFormField label="Endereço da carteira" required error={errors.address?.message}>
          {(field) => (
            <AppInput {...register("address")} {...field} placeholder="Endereço 0x da carteira" autoComplete="off" spellCheck={false} invalid={Boolean(errors.address)} />
          )}
        </AppFormField>

        <AppFormField label="ENS ou carteira secundária" helper="Opcional." error={errors.secondaryRef?.message}>
          {(field) => <AppInput {...register("secondaryRef")} {...field} autoComplete="off" spellCheck={false} invalid={Boolean(errors.secondaryRef)} />}
        </AppFormField>

        <AppFormField label="Tipo de carteira" required error={errors.walletType?.message}>
          {(field) => (
            <FieldSelect {...register("walletType")} {...field} invalid={Boolean(errors.walletType)}>
              <option value="">Selecione uma carteira</option>
              {WALLET_PROVIDERS.map((id) => (
                <option key={id} value={id}>
                  {WALLET_PROVIDER_LABELS[id]}
                </option>
              ))}
            </FieldSelect>
          )}
        </AppFormField>

        <AppFormField label="Código de indicação" required error={errors.referralCode?.message}>
          {(field) => <AppInput {...register("referralCode")} {...field} autoComplete="off" invalid={Boolean(errors.referralCode)} />}
        </AppFormField>

        <AppFormField label="E-mail" required error={errors.email?.message}>
          {(field) => <AppInput {...register("email")} {...field} type="email" autoComplete="email" invalid={Boolean(errors.email)} />}
        </AppFormField>

        <Controller
          control={control}
          name="ensName"
          render={({ field }) => (
            <EnsNameField required value={field.value ?? ""} onChange={field.onChange} error={errors.ensName?.message} disabled={locked} />
          )}
        />
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <AppButton type="submit" size="md" isLoading={isSubmitting}>
          {submitLabel}
        </AppButton>
        {onCancel && (
          <AppButton type="button" variant="ghost" size="md" onClick={onCancel}>
            Cancelar
          </AppButton>
        )}
      </div>
    </form>
  );
}
