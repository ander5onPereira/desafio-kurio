import { z } from "zod";

/**
 * Contrato de erros da API.
 *
 * Status HTTP → code (o `code` é o que a UI usa; o status é só transporte):
 *  400/422 VALIDATION_ERROR (com fieldErrors) · 401 UNAUTHENTICATED | SESSION_EXPIRED · 403 FORBIDDEN
 *  404 NOT_FOUND · 409 CONFLICT | EMAIL_TAKEN | USERNAME_TAKEN | AVAILABILITY_CONFLICT | QUOTE_CHANGED
 *  | IDEMPOTENCY_KEY_REUSED · 422 COUPON_INVALID | COUPON_EXPIRED | WALLET_REJECTED · 429 RATE_LIMITED
 *  · 500/502/503/504 TRANSIENT | INTERNAL.
 *
 * Códigos gerados só no cliente (nunca vêm da API): NETWORK_ERROR (sem resposta),
 * TIMEOUT, INVALID_RESPONSE (resposta fora do contrato) e UNKNOWN.
 */
export const SERVER_ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "SESSION_EXPIRED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "EMAIL_TAKEN",
  "USERNAME_TAKEN",
  "AVAILABILITY_CONFLICT",
  "QUOTE_CHANGED",
  "IDEMPOTENCY_KEY_REUSED",
  "COUPON_INVALID",
  "COUPON_EXPIRED",
  "WALLET_REJECTED",
  "RATE_LIMITED",
  "TRANSIENT",
  "INTERNAL",
] as const;

export const CLIENT_ERROR_CODES = ["NETWORK_ERROR", "TIMEOUT", "INVALID_RESPONSE", "UNKNOWN"] as const;

export const API_ERROR_CODES = [...SERVER_ERROR_CODES, ...CLIENT_ERROR_CODES] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const apiErrorBodySchema = z.object({
  code: z.enum(SERVER_ERROR_CODES),
  message: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;

export const RETRYABLE_CODES: readonly ApiErrorCode[] = [
  "TRANSIENT",
  "INTERNAL",
  "RATE_LIMITED",
  "NETWORK_ERROR",
  "TIMEOUT",
];
