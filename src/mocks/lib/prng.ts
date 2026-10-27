/**
 * PRNG determinístico (mulberry32). Todo "acaso" do servidor simulado (ids, tokens, latências,
 * fixtures) vem daqui — nunca de Math.random — para que cenários sejam reproduzíveis.
 */
export interface Rng {
  /** Número em [0, 1). */
  next(): number;
  /** Inteiro em [min, max] (inclusivo). */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  /** String hexadecimal de `length` caracteres. */
  hex(length: number): string;
  getState(): number;
  setState(state: number): void;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    pick: (items) => {
      const item = items[Math.floor(next() * items.length)];
      if (item === undefined) throw new Error("pick() em lista vazia");
      return item;
    },
    hex: (length) => {
      let out = "";
      while (out.length < length) out += Math.floor(next() * 0xffffffff).toString(16).padStart(8, "0");
      return out.slice(0, length);
    },
    getState: () => state,
    setState: (value) => {
      state = value >>> 0;
    },
  };
}

/** UUID v4 válido (versão 4, variante 8–b) gerado a partir do PRNG. */
export function uuidFrom(rng: Rng): string {
  const hex = rng.hex(32).split("");
  hex[12] = "4";
  hex[16] = "89ab"[Math.floor(rng.next() * 4)] ?? "8";
  const h = hex.join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}
