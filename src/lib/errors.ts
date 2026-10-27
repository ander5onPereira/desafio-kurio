import axios from "axios";
import {
  apiErrorBodySchema,
  RETRYABLE_CODES,
  type ApiErrorBody,
  type ApiErrorCode,
} from "@/contracts";

/**
 * Erro único que a aplicação enxerga. O interceptor do Axios converte QUALQUER falha
 * (resposta de erro, queda de conexão, timeout, resposta fora do contrato) em `ApiError`.
 * A UI decide por `code` (e `fieldErrors`), nunca pelo status HTTP.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number | null;
  readonly fieldErrors: Record<string, string[]>;
  readonly meta: Record<string, unknown>;
  readonly retryable: boolean;

  constructor(init: {
    code: ApiErrorCode;
    message: string;
    status?: number | null;
    fieldErrors?: Record<string, string[]>;
    meta?: Record<string, unknown>;
    cause?: unknown;
  }) {
    super(init.message, { cause: init.cause });
    this.name = "ApiError";
    this.code = init.code;
    this.status = init.status ?? null;
    this.fieldErrors = init.fieldErrors ?? {};
    this.meta = init.meta ?? {};
    this.retryable = RETRYABLE_CODES.includes(init.code);
  }

  /** Primeira mensagem do campo (para exibir sob o input). */
  fieldError(field: string): string | undefined {
    return this.fieldErrors[field]?.[0];
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

export const hasErrorCode = (error: unknown, ...codes: ApiErrorCode[]): error is ApiError =>
  isApiError(error) && codes.includes(error.code);

/** Converte qualquer erro lançado pelo Axios em ApiError. */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;

  if (axios.isCancel(error)) {
    // Requisição cancelada (resposta obsoleta): não é uma falha para o usuário.
    return new ApiError({ code: "UNKNOWN", message: "Requisição cancelada", cause: error });
  }

  if (axios.isAxiosError(error)) {
    if (error.response) {
      const parsed = apiErrorBodySchema.safeParse(error.response.data);
      const status = error.response.status;
      if (parsed.success) return fromBody(parsed.data, status, error);
      return new ApiError({
        code: status >= 500 ? "TRANSIENT" : "UNKNOWN",
        message: "Não foi possível concluir a operação.",
        status,
        cause: error,
      });
    }
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return new ApiError({ code: "TIMEOUT", message: "A requisição demorou demais.", cause: error });
    }
    return new ApiError({
      code: "NETWORK_ERROR",
      message: "Sem conexão com o servidor. Verifique sua internet.",
      cause: error,
    });
  }

  return new ApiError({
    code: "UNKNOWN",
    message: error instanceof Error ? error.message : "Erro inesperado.",
    cause: error,
  });
}

function fromBody(body: ApiErrorBody, status: number, cause: unknown): ApiError {
  return new ApiError({
    code: body.code,
    message: body.message,
    status,
    fieldErrors: body.fieldErrors,
    meta: body.meta,
    cause,
  });
}
