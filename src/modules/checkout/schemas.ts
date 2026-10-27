import { z } from "zod";
import { collectorSchema } from "@/contracts";

/**
 * Formulário do pagamento = `collectorSchema` (contrato do pedido) + a carteira escolhida.
 * Os campos de carteira que o Figma mostra (rede, endereço, tipo, ENS secundário) vêm DA CARTEIRA
 * selecionada (somente leitura) — por isso aqui só existe o `walletId`.
 */
export const checkoutFormSchema = collectorSchema.extend({
  walletId: z.string().min(1, "Selecione uma carteira"),
});

export type CheckoutFormInput = z.input<typeof checkoutFormSchema>;
export type CheckoutFormValues = z.output<typeof checkoutFormSchema>;

/** Campos validados no passo 1 (mobile) antes de ir para "Carteira e rede". */
export const DATA_STEP_FIELDS = [
  "displayName",
  "username",
  "profileName",
  "email",
  "ensName",
  "referralCode",
  "note",
] as const satisfies readonly (keyof CheckoutFormInput)[];
