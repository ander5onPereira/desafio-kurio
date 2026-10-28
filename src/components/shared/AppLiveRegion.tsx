import { useSyncExternalStore } from "react";

/**
 * Anunciador global para leitores de tela (feedback de mutations, mudanças em tempo real,
 * resultados de busca, navegação). Uso: `announce("Preço de Emerald Ape #042 atualizado")`.
 * O <AppLiveRegion /> é montado UMA vez no root (__root.tsx).
 */
type Politeness = "polite" | "assertive";
interface AnnouncerState {
  polite: string;
  assertive: string;
}

let state: AnnouncerState = { polite: "", assertive: "" };
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => state;

/** Anuncia `message`. Limpa antes para que a MESMA mensagem repetida seja lida de novo. */
export function announce(message: string, politeness: Politeness = "polite") {
  state = { ...state, [politeness]: "" };
  emit();
  setTimeout(() => {
    state = { ...state, [politeness]: message };
    emit();
  }, 50);
}

export function useAnnounce() {
  return announce;
}

export function AppLiveRegion() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return (
    <>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {current.polite}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="true" className="sr-only">
        {current.assertive}
      </div>
    </>
  );
}
