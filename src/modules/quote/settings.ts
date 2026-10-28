import { useSyncExternalStore } from "react";
import { networkId, type NetworkId } from "@/contracts";
import { authStore } from "@/modules/auth";

/**
 * Preferências da cotação: cupom aplicado e rede. Persistem em sessionStorage para sobreviver a
 * refresh (README: "cupom ... após refresh"). Não é dado privado sensível; mesmo assim é descartado
 * ao sair ou trocar de usuário (isolamento).
 */
export interface QuoteSettings {
  couponCode: string | null;
  network: NetworkId;
  notice: string | null;
}

const STORAGE_KEY = "kurio.quoteSettings";
const DEFAULTS: QuoteSettings = { couponCode: null, network: "ethereum", notice: null };

function read(): QuoteSettings {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<QuoteSettings>;
    const network = networkId.safeParse(parsed.network);
    return {
      couponCode: typeof parsed.couponCode === "string" ? parsed.couponCode : null,
      network: network.success ? network.data : DEFAULTS.network,
      notice: typeof parsed.notice === "string" ? parsed.notice : null,
    };
  } catch {
    return DEFAULTS;
  }
}

let state: QuoteSettings = read();
const listeners = new Set<() => void>();

function commit(next: QuoteSettings) {
  state = next;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // sessionStorage indisponível: as preferências ficam só em memória.
  }
  listeners.forEach((listener) => listener());
}

export const quoteSettings = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setCoupon: (couponCode: string) => commit({ ...state, couponCode, notice: null }),
  clearCoupon: (notice: string | null = null) => commit({ ...state, couponCode: null, notice }),
  setNetwork: (network: NetworkId) => (state.network === network ? undefined : commit({ ...state, network })),
  dismissNotice: () => commit({ ...state, notice: null }),
  reset: () => commit(DEFAULTS),
};

export function useQuoteSettings(): QuoteSettings {
  return useSyncExternalStore(quoteSettings.subscribe, quoteSettings.get, quoteSettings.get);
}

// Logout ou troca de usuário descartam cupom/rede (nada do usuário anterior sobrevive).
// Expiração de sessão PRESERVA (o usuário retoma o checkout de onde parou, com o mesmo cupom).
let lastUserId: string | null = authStore.getSnapshot().user?.id ?? null;
authStore.subscribe((snapshot, change) => {
  const currentUserId = snapshot.user?.id ?? null;
  if (change.reason === "logout") {
    quoteSettings.reset();
    lastUserId = null;
    return;
  }
  if (currentUserId && lastUserId && currentUserId !== lastUserId) quoteSettings.reset();
  if (currentUserId) lastUserId = currentUserId;
});
