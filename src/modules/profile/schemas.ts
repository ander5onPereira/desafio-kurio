import { z } from "zod";
import { passwordSchema, updateProfileBodySchema, type Profile, type UpdateProfileBody } from "@/contracts";

/**
 * Formulário de "Perfil do colecionador": dados + (opcional) troca de senha no mesmo "Salvar", como
 * no Figma. Os campos de dados vêm do contrato; a troca de senha só é validada se algum dos três
 * campos de senha for preenchido.
 */
export const profileFormSchema = updateProfileBodySchema
  .extend({
    currentPassword: z.string(),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((value, ctx) => {
    const wantsPassword = Boolean(value.currentPassword || value.newPassword || value.confirmPassword);
    if (!wantsPassword) return;

    if (!value.currentPassword) {
      ctx.addIssue({ code: "custom", path: ["currentPassword"], message: "Informe a senha atual" });
    }
    const strength = passwordSchema.safeParse(value.newPassword);
    if (!strength.success) {
      ctx.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: value.newPassword ? (strength.error.issues[0]?.message ?? "Senha inválida") : "Informe a nova senha",
      });
    }
    if (value.newPassword !== value.confirmPassword) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "As senhas não coincidem" });
    }
  });

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const PROFILE_FIELD_NAMES = [
  "displayName",
  "username",
  "email",
  "ensName",
  "walletNickname",
  "currentPassword",
  "newPassword",
] as const satisfies readonly (keyof ProfileFormValues)[];

export function toFormValues(profile: Profile): ProfileFormValues {
  return {
    displayName: profile.displayName,
    username: profile.username,
    email: profile.email,
    ensName: profile.ensName ?? "",
    walletNickname: profile.walletNickname ?? "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  };
}

export function toProfileBody(values: ProfileFormValues): UpdateProfileBody {
  return {
    displayName: values.displayName,
    username: values.username,
    email: values.email,
    ensName: values.ensName,
    walletNickname: values.walletNickname,
  };
}
