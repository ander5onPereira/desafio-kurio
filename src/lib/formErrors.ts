import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { isApiError } from "./errors";

/**
 * Leva os `fieldErrors` de um ApiError (422/409 do servidor) para os campos do React Hook Form.
 * Só aplica nomes que existem em `fields` (o resto vira erro geral). Retorna a mensagem geral
 * (ou null quando tudo foi mapeado para campos) para o formulário exibir/anunciar.
 */
export function applyApiFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  if (!isApiError(error)) return "Não foi possível concluir a operação.";

  let mapped = 0;
  for (const [name, messages] of Object.entries(error.fieldErrors)) {
    const field = fields.find((candidate) => candidate === name);
    const message = messages[0];
    if (field && message) {
      setError(field, { type: "server", message });
      mapped++;
    }
  }
  // Erro com campos mapeados não precisa de mensagem geral; sem campos, mostra a do servidor.
  return mapped > 0 ? null : error.message;
}
