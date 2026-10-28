import { z } from "zod";
import { passwordSchema, userSchema, usernameSchema } from "./auth";

export const profileSchema = userSchema;
export type Profile = z.infer<typeof profileSchema>;

/** Campos com * no Figma (nome de exibição, usuário, e-mail, ENS, apelido da carteira) são obrigatórios. */
export const updateProfileBodySchema = z.object({
  displayName: z.string().trim().min(2, "Informe o nome de exibição").max(40),
  username: usernameSchema,
  email: z.email("E-mail inválido"),
  ensName: z.string().trim().min(3, "Informe o nome ENS").max(60),
  walletNickname: z.string().trim().min(2, "Informe o apelido da carteira").max(24),
});
export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;

/** Avatar: o cliente reduz a imagem (≤ 256px) e envia como data URL. */
export const AVATAR_MAX_BYTES = 300_000;
export const updateAvatarBodySchema = z.object({
  dataUrl: z
    .string()
    .regex(/^data:image\/(png|jpeg|webp);base64,/, "Formato de imagem inválido")
    .max(AVATAR_MAX_BYTES * 2, "Imagem muito grande"),
});

/** Erros de campo esperados: currentPassword ("Senha atual incorreta"), newPassword. */
export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1, "Informe a senha atual"),
  newPassword: passwordSchema,
});
export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;
