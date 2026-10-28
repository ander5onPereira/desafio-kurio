import { z } from "zod";
import { quoteSchema, walletProvider } from "@/contracts";

/**
 * Rascunho do checkout (sessionStorage, uma chave POR USUÁRIO: `kurio.checkoutDraft:<userId>`).
 *
 * Guarda o que é preciso para RETOMAR sem perder contexto nem duplicar compra:
 *  - dados do formulário, carteira, provedor e a etapa;
 *  - a cotação revisada (id + revision que serão enviados);
 *  - a `idempotencyKey` da tentativa e se o envio está "em voo" (resposta ainda desconhecida).
 *
 * O prefixo `kurio.checkoutDraft` é limpo pelo auth no logout/troca de usuário; na expiração da
 * sessão o rascunho é PRESERVADO (o usuário volta ao mesmo ponto depois de entrar de novo).
 * Funções puras com `Storage` injetável (testáveis sem navegador).
 */
export const CHECKOUT_DRAFT_PREFIX = "kurio.checkoutDraft";

export const draftFormSchema = z.object({
  displayName: z.string().default(""),
  username: z.string().default(""),
  profileName: z.string().default(""),
  email: z.string().default(""),
  ensName: z.string().default(""),
  referralCode: z.string().default(""),
  note: z.string().default(""),
});
export type DraftFormValues = z.infer<typeof draftFormSchema>;

export const checkoutDraftSchema = z.object({
  idempotencyKey: z.string().min(8),
  step: z.enum(["data", "wallet", "review"]).default("data"),
  form: draftFormSchema,
  walletId: z.string().nullable(),
  provider: walletProvider.nullable(),
  reviewed: quoteSchema.nullable(),
  /** true = o POST /orders foi disparado e a resposta ainda não é conhecida (timeout/queda). */
  inFlight: z.boolean(),
  orderId: z.string().nullable(),
});
export type CheckoutDraft = z.infer<typeof checkoutDraftSchema>;

export const createIdempotencyKey = (): string => crypto.randomUUID();

export function emptyDraft(): CheckoutDraft {
  return {
    idempotencyKey: createIdempotencyKey(),
    step: "data",
    form: draftFormSchema.parse({}),
    walletId: null,
    provider: null,
    reviewed: null,
    inFlight: false,
    orderId: null,
  };
}

export const draftStorageKey = (userId: string) => `${CHECKOUT_DRAFT_PREFIX}:${userId}`;

export function loadDraft(storage: Pick<Storage, "getItem">, userId: string): CheckoutDraft | null {
  try {
    const raw = storage.getItem(draftStorageKey(userId));
    if (!raw) return null;
    const parsed = checkoutDraftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveDraft(storage: Pick<Storage, "setItem">, userId: string, draft: CheckoutDraft): void {
  try {
    storage.setItem(draftStorageKey(userId), JSON.stringify(draft));
  } catch {
    // Storage cheio/indisponível: o checkout segue funcionando, só sem retomada após refresh.
  }
}

export function clearDraft(storage: Pick<Storage, "removeItem">, userId: string): void {
  try {
    storage.removeItem(draftStorageKey(userId));
  } catch {
    // ignora
  }
}

export function draftStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
