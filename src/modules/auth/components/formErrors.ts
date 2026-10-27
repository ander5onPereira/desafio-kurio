import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { isApiError } from "@/lib/errors";

/**
 * Traduz um erro da API para a interface de formulário:
 *  - erros por campo (`fieldErrors`) e conflitos conhecidos vão para o campo certo;
 *  - o que sobrar vira uma mensagem geral (exibida com role="alert").
 * Retorna a mensagem geral, ou null quando tudo foi mapeado para campos.
 */
export function applyApiErrorToForm<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  if (!isApiError(error)) return "Algo deu errado. Tente novamente.";

  let mapped = false;
  for (const field of fields) {
    const message = error.fieldError(field);
    if (message) {
      setError(field, { type: "server", message });
      mapped = true;
    }
  }

  const conflictField: Partial<Record<string, string>> = {
    EMAIL_TAKEN: "email",
    USERNAME_TAKEN: "username",
  };
  const conflict = conflictField[error.code] as Path<T> | undefined;
  if (conflict && fields.includes(conflict)) {
    setError(conflict, { type: "server", message: error.message });
    return null;
  }
  if (mapped) return null;

  switch (error.code) {
    case "UNAUTHENTICATED":
      return "E-mail ou senha incorretos. Confira os dados e tente novamente.";
    case "NETWORK_ERROR":
    case "TIMEOUT":
      return "Sem conexão com o servidor. Verifique sua internet e tente novamente.";
    case "TRANSIENT":
    case "INTERNAL":
      return "O servidor está instável no momento. Tente novamente em instantes.";
    case "RATE_LIMITED":
      return "Muitas tentativas. Aguarde um instante e tente novamente.";
    default:
      return error.message;
  }
}
