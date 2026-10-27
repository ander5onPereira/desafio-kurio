import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { AppButton, AppFormField, AppInput, AppPasswordInput } from "@/components/ui";
import type { Profile } from "@/contracts";
import { applyApiFieldErrors } from "@/lib/formErrors";
import { EnsNameField } from "@/modules/wallets";
import { useChangePassword, useUpdateProfile } from "../hooks";
import {
  PROFILE_FIELD_NAMES,
  profileFormSchema,
  toFormValues,
  toProfileBody,
  type ProfileFormValues,
} from "../schemas";
import { AvatarField } from "./AvatarField";

/**
 * ProfileForm — "Perfil do colecionador" + "Alterar senha" com um único "Salvar" (como no Figma).
 *  - A senha só é enviada quando algum dos três campos de senha foi preenchido.
 *  - Erros 409/422 da API caem no campo certo; o que não mapear vira alerta geral.
 *  - O avatar é independente (aplica na hora), por isso fica fora do submit.
 */
export function ProfileForm({ profile }: { profile: Profile }) {
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const [generalError, setGeneralError] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: toFormValues(profile),
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
    formState: { errors, isSubmitting, dirtyFields },
  } = form;

  async function onSubmit(values: ProfileFormValues) {
    setGeneralError(null);
    const wantsPassword = Boolean(values.currentPassword || values.newPassword || values.confirmPassword);
    const profileChanged = (["displayName", "username", "email", "ensName", "walletNickname"] as const).some(
      (field) => dirtyFields[field],
    );

    if (!profileChanged && !wantsPassword) {
      toast.info("Nenhuma alteração para salvar.");
      return;
    }

    let saved: Profile = profile;
    if (profileChanged) {
      try {
        saved = await updateProfile.mutateAsync(toProfileBody(values));
      } catch (failure) {
        setGeneralError(applyApiFieldErrors(failure, setError, PROFILE_FIELD_NAMES));
        return;
      }
    }

    if (wantsPassword) {
      try {
        await changePassword.mutateAsync({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      } catch (failure) {
        setGeneralError(applyApiFieldErrors(failure, setError, PROFILE_FIELD_NAMES));
        if (profileChanged) toast.warning("Dados salvos, mas a senha não foi alterada.");
        reset({ ...toFormValues(saved), currentPassword: values.currentPassword, newPassword: values.newPassword, confirmPassword: values.confirmPassword }, { keepErrors: true });
        return;
      }
    }

    toast.success(wantsPassword ? "Perfil e senha atualizados." : "Perfil atualizado.");
    reset(toFormValues(saved));
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Perfil do colecionador" className="flex flex-col gap-8">
      {generalError && (
        <p role="alert" className="rounded-md border border-danger/40 bg-danger-surface px-4 py-3 text-sm text-danger">
          {generalError}
        </p>
      )}

      <div className="grid gap-x-6 gap-y-6 md:grid-cols-2">
        <AppFormField label="Nome de exibição" required error={errors.displayName?.message}>
          {(field) => <AppInput {...register("displayName")} {...field} autoComplete="name" invalid={Boolean(errors.displayName)} />}
        </AppFormField>

        <AppFormField label="Nome de usuário" required error={errors.username?.message}>
          {(field) => <AppInput {...register("username")} {...field} autoComplete="username" invalid={Boolean(errors.username)} />}
        </AppFormField>

        <AppFormField label="E-mail" required error={errors.email?.message}>
          {(field) => <AppInput {...register("email")} {...field} type="email" autoComplete="email" invalid={Boolean(errors.email)} />}
        </AppFormField>

        <Controller
          control={control}
          name="ensName"
          render={({ field }) => (
            <EnsNameField required value={field.value} onChange={field.onChange} error={errors.ensName?.message} />
          )}
        />

        <AppFormField label="Apelido da carteira" required error={errors.walletNickname?.message}>
          {(field) => <AppInput {...register("walletNickname")} {...field} invalid={Boolean(errors.walletNickname)} />}
        </AppFormField>

        <AvatarField profile={profile} />
      </div>

      <section aria-labelledby="alterar-senha" className="flex flex-col gap-6">
        <h2 id="alterar-senha" className="text-base font-bold text-foreground">
          Alterar senha
        </h2>
        <div className="grid gap-x-6 gap-y-6 md:grid-cols-2">
          <div className="flex flex-col gap-6">
            <AppFormField label="Senha atual" error={errors.currentPassword?.message}>
              {(field) => (
                <AppPasswordInput {...register("currentPassword")} {...field} autoComplete="current-password" invalid={Boolean(errors.currentPassword)} />
              )}
            </AppFormField>
            <AppFormField label="Nova senha" helper="Mínimo de 8 caracteres, com letra e número." error={errors.newPassword?.message}>
              {(field) => (
                <AppPasswordInput {...register("newPassword")} {...field} autoComplete="new-password" invalid={Boolean(errors.newPassword)} />
              )}
            </AppFormField>
            <AppFormField label="Confirmar nova senha" error={errors.confirmPassword?.message}>
              {(field) => (
                <AppPasswordInput {...register("confirmPassword")} {...field} autoComplete="new-password" invalid={Boolean(errors.confirmPassword)} />
              )}
            </AppFormField>
          </div>
        </div>
      </section>

      <div>
        <AppButton type="submit" size="md" isLoading={isSubmitting} className="min-w-32">
          Salvar
        </AppButton>
      </div>
    </form>
  );
}
