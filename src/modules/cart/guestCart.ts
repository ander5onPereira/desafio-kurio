/**
 * Id do carrinho de VISITANTE (header `X-Cart-Id`). Fica em localStorage para sobreviver a refresh.
 * É criado sob demanda (primeira leitura/escrita do carrinho como visitante) e descartado depois da
 * mescla com o carrinho do usuário (POST /cart/merge).
 */
const STORAGE_KEY = "kurio.guestCartId";

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Devolve o id existente, sem criar. Usado pela ponte do Axios e pela mescla. */
export function peekGuestCartId(): string | null {
  return storage()?.getItem(STORAGE_KEY) ?? null;
}

/** Devolve o id existente ou cria um novo (UUID). */
export function ensureGuestCartId(): string {
  const existing = peekGuestCartId();
  if (existing) return existing;
  const created = crypto.randomUUID();
  storage()?.setItem(STORAGE_KEY, created);
  return created;
}

export function clearGuestCartId(): void {
  storage()?.removeItem(STORAGE_KEY);
}
