import type { ApiErrorBody } from "@/contracts";

type ServerCode = ApiErrorBody["code"];

export class ServerError extends Error {
  readonly status: number;
  readonly code: ServerCode;
  readonly fieldErrors?: Record<string, string[]>;
  readonly meta?: Record<string, unknown>;

  constructor(
    status: number,
    code: ServerCode,
    message: string,
    extra: { fieldErrors?: Record<string, string[]>; meta?: Record<string, unknown> } = {},
  ) {
    super(message);
    this.name = "ServerError";
    this.status = status;
    this.code = code;
    this.fieldErrors = extra.fieldErrors;
    this.meta = extra.meta;
  }

  toBody(): ApiErrorBody {
    return {
      code: this.code,
      message: this.message,
      ...(this.fieldErrors ? { fieldErrors: this.fieldErrors } : {}),
      ...(this.meta ? { meta: this.meta } : {}),
    };
  }
}

export const notFound = (what: string) => new ServerError(404, "NOT_FOUND", `${what} não encontrado.`);
export const unauthenticated = (message = "Faça login para continuar.") =>
  new ServerError(401, "UNAUTHENTICATED", message);
export const sessionExpired = () => new ServerError(401, "SESSION_EXPIRED", "Sua sessão expirou. Entre novamente.");
export const validation = (fieldErrors: Record<string, string[]>, message = "Verifique os campos informados.") =>
  new ServerError(422, "VALIDATION_ERROR", message, { fieldErrors });

export function defaultCodeForStatus(status: number): ServerCode {
  if (status === 401) return "UNAUTHENTICATED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 429) return "RATE_LIMITED";
  if (status === 400 || status === 422) return "VALIDATION_ERROR";
  if (status === 500) return "INTERNAL";
  return "TRANSIENT";
}
