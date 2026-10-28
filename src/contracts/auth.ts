import { z } from "zod";
import { idSchema, isoDate } from "./common";

export const passwordSchema = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres")
  .regex(/[A-Za-z]/, "A senha deve ter pelo menos uma letra")
  .regex(/\d/, "A senha deve ter pelo menos um número");

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Mínimo de 3 caracteres")
  .max(24, "Máximo de 24 caracteres")
  .regex(/^[a-z0-9_.]+$/, "Use apenas letras minúsculas, números, ponto e sublinhado");

export const userSchema = z.object({
  id: idSchema,
  username: z.string(),
  displayName: z.string(),
  email: z.email(),
  avatarUrl: z.string().nullable(),
  ensName: z.string().nullable(),
  walletNickname: z.string().nullable(),
  createdAt: isoDate,
});
export type User = z.infer<typeof userSchema>;

export const registerBodySchema = z.object({
  username: usernameSchema,
  email: z.email("E-mail inválido"),
  password: passwordSchema,
});
export type RegisterBody = z.infer<typeof registerBodySchema>;

export const loginBodySchema = z.object({
  email: z.email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});
export type LoginBody = z.infer<typeof loginBodySchema>;

export const sessionSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: isoDate,
  user: userSchema,
});
export type Session = z.infer<typeof sessionSchema>;

export const refreshBodySchema = z.object({ refreshToken: z.string() });
export const refreshResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: isoDate,
});
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;
