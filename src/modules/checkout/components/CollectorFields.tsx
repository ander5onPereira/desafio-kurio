import { Controller, type UseFormReturn } from "react-hook-form";
import { AppCheckbox, AppFormField, AppInput, AppTextarea } from "@/components/ui";
import { NETWORK_LABELS, WALLET_PROVIDER_LABELS, type Wallet, type WalletProvider } from "@/contracts";
import type { CheckoutFormInput, CheckoutFormValues } from "../schemas";
import { EnsField } from "./EnsField";

export type CheckoutForm = UseFormReturn<CheckoutFormInput, unknown, CheckoutFormValues>;

interface CollectorFieldsProps {
  form: CheckoutForm;
  /** Desktop mostra também os campos derivados da carteira (rede, endereço, tipo, ENS secundário). */
  showWalletFields: boolean;
  wallet: Wallet | null;
  provider: WalletProvider | null;
  /** "Usar outra carteira?" (só desktop, quando há mais de uma carteira). */
  canSwitchWallet: boolean;
  switchWalletOpen: boolean;
  onSwitchWalletChange: (open: boolean) => void;
}

/** Campos do "Perfil do colecionador" (Figma). Obrigatórios marcados com * (AppFormField `required`). */
export function CollectorFields({
  form,
  showWalletFields,
  wallet,
  provider,
  canSwitchWallet,
  switchWalletOpen,
  onSwitchWalletChange,
}: CollectorFieldsProps) {
  const { register, control, formState } = form;
  const { errors } = formState;

  return (
    <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
      <AppFormField label="Nome de exibição" required error={errors.displayName?.message}>
        {(field) => <AppInput {...register("displayName")} {...field} autoComplete="name" />}
      </AppFormField>

      <AppFormField label="Nome de usuário" required error={errors.username?.message}>
        {(field) => <AppInput {...register("username")} {...field} autoComplete="username" />}
      </AppFormField>

      {showWalletFields && (
        <AppFormField label="Rede" required helper="Definida pela carteira selecionada.">
          {(field) => (
            <AppInput {...field} readOnly value={wallet ? NETWORK_LABELS[wallet.network] : ""} placeholder="Selecione uma carteira" />
          )}
        </AppFormField>
      )}

      <AppFormField label="Nome do perfil" required error={errors.profileName?.message}>
        {(field) => <AppInput {...register("profileName")} {...field} />}
      </AppFormField>

      {showWalletFields && (
        <>
          <AppFormField label="Endereço da carteira" required>
            {(field) => <AppInput {...field} readOnly value={wallet?.address ?? ""} placeholder="Endereço 0x da carteira" />}
          </AppFormField>
          <AppFormField label="ENS ou carteira secundária (opcional)">
            {(field) => <AppInput {...field} readOnly value={wallet?.secondaryRef ?? ""} />}
          </AppFormField>
          <AppFormField label="Tipo de carteira" required>
            {(field) => (
              <AppInput {...field} readOnly value={provider ? WALLET_PROVIDER_LABELS[provider] : ""} placeholder="Selecione uma carteira" />
            )}
          </AppFormField>
        </>
      )}

      <AppFormField label="Código de indicação" required error={errors.referralCode?.message}>
        {(field) => <AppInput {...register("referralCode")} {...field} autoComplete="off" />}
      </AppFormField>

      <AppFormField label="E-mail" required error={errors.email?.message}>
        {(field) => <AppInput {...register("email")} {...field} type="email" autoComplete="email" />}
      </AppFormField>

      <AppFormField label="Nome ENS" required error={errors.ensName?.message}>
        {(field) => (
          <Controller
            control={control}
            name="ensName"
            render={({ field: ens }) => (
              <EnsField value={ens.value} onChange={ens.onChange} onBlur={ens.onBlur} invalid={!!errors.ensName} field={field} />
            )}
          />
        )}
      </AppFormField>

      {showWalletFields && canSwitchWallet && (
        <div className="md:col-span-2">
          <AppCheckbox label="Usar outra carteira?" checked={switchWalletOpen} onCheckedChange={(checked) => onSwitchWalletChange(checked === true)} />
        </div>
      )}

      <AppFormField
        label="Observação do colecionador (opcional)"
        error={errors.note?.message}
        helper="Até 280 caracteres."
        className="md:col-span-2"
      >
        {(field) => <AppTextarea {...register("note")} {...field} rows={5} />}
      </AppFormField>
    </div>
  );
}
