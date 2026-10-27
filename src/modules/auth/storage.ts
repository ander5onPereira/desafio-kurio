import { sessionSchema, type Session } from "@/contracts";

/**
 * Persistência da sessão em localStorage (sobrevive ao refresh).
 * Em produção real o refresh token ficaria em cookie HttpOnly; o MSW não emite HttpOnly,
 * então aqui o token é guardado no storage (limitação documentada em ARCHITECTURE.md).
 * A senha NUNCA é guardada.
 */
export const SESSION_STORAGE_KEY = "kurio.session";

/** Prefixos de chaves privadas por usuário (limpas no logout e na troca de usuário). */
const PRIVATE_KEY_PREFIXES = ["kurio.checkoutDraft", "kurio.private."];

export function readStoredSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = sessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeStoredSession(session: Session): void {
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage indisponível (modo privado/cota): a sessão vale só até o refresh.
  }
}

export function clearStoredSession(): void {
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignora
  }
}

/** Remove dados privados do usuário anterior (rascunho de checkout etc.). NÃO apaga o carrinho do servidor. */
export function clearPrivateStorage(): void {
  for (const storage of [safeStorage("local"), safeStorage("session")]) {
    if (!storage) continue;
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && PRIVATE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) keys.push(key);
    }
    keys.forEach((key) => storage.removeItem(key));
  }
}

function safeStorage(kind: "local" | "session"): Storage | null {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}
