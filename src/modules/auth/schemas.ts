import { z } from "zod";
import { loginBodySchema, registerBodySchema } from "@/contracts";

/**
 * Schemas dos formulários = schemas do contrato (o servidor valida as mesmas regras).
 * O cadastro acrescenta "confirmar senha", que existe só na interface.
 */
export const loginFormSchema = loginBodySchema;
export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const registerFormSchema = registerBodySchema
  .extend({ confirmPassword: z.string().min(1, "Confirme a senha") })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem",
  });
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
