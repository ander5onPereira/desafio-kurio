import { z } from "zod";

/** Variáveis de ambiente tipadas. Falha cedo (no boot) se algo estiver inválido. */
const envSchema = z.object({
  VITE_ENABLE_MOCKS: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  VITE_MOCK_SCENARIO: z.string().default("default"),
  VITE_API_URL: z.string().default("/api"),
});

export const env = envSchema.parse(import.meta.env);
