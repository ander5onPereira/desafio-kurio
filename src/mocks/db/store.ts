import type { ScenarioId } from "@/contracts";
import { DB_RNG_SEED, DB_SCHEMA_VERSION, DB_STORAGE_KEY } from "../config";
import { createRng, uuidFrom } from "../lib/prng";
import type { DbState } from "./types";

/**
 * Store do servidor simulado: UM estado em memória, persistido em localStorage (debounce) para
 * sobreviver a refresh. `reset` reconstrói tudo a partir do seed do cenário.
 */
let state: DbState | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
const resetListeners = new Set<() => void>();

const hasStorage = () => {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
};

export function isDbReady(): boolean {
  return state !== null;
}

export function getDb(): DbState {
  if (!state) throw new Error("Banco do mock não inicializado (chame initDb/resetDb antes).");
  return state;
}

export function setDb(next: DbState): void {
  state = next;
  installPersistenceHooks();
  persistNow();
}

const hooked = new WeakSet<object>();

/**
 * O debounce de 120 ms perderia o que mudou logo antes de um refresh. Por isso também gravamos de
 * forma SÍNCRONA em `pagehide` e quando a aba fica oculta (`visibilitychange` → hidden).
 * Parâmetros existem para os testes injetarem alvos falsos.
 */
export function installPersistenceHooks(
  win: EventTarget | undefined = typeof window !== "undefined" ? window : undefined,
  doc: (EventTarget & { visibilityState?: string }) | undefined = typeof document !== "undefined" ? document : undefined,
): void {
  if (win && !hooked.has(win)) {
    hooked.add(win);
    win.addEventListener("pagehide", persistNow);
  }
  if (doc && !hooked.has(doc)) {
    hooked.add(doc);
    doc.addEventListener("visibilitychange", () => {
      if (doc.visibilityState === "hidden") persistNow();
    });
  }
}

export function onDbReset(listener: () => void): () => void {
  resetListeners.add(listener);
  return () => resetListeners.delete(listener);
}

export function notifyReset(): void {
  for (const listener of resetListeners) listener();
}

export function mutate<T>(fn: (db: DbState) => T): T {
  const result = fn(getDb());
  schedulePersist();
  return result;
}

function schedulePersist() {
  if (!hasStorage()) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(persistNow, 120);
}

export function persistNow(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (!state || !hasStorage()) return;
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota cheia ou storage bloqueado: o mock segue funcionando em memória.
  }
}

export function loadPersisted(): DbState | null {
  if (!hasStorage()) return null;
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DbState;
    return parsed.schemaVersion === DB_SCHEMA_VERSION && parsed.meta ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPersisted(): void {
  if (!hasStorage()) return;
  try {
    localStorage.removeItem(DB_STORAGE_KEY);
  } catch {
    // ignorado
  }
}

export function withRng<T>(fn: (rng: ReturnType<typeof createRng>) => T): T {
  const db = getDb();
  const rng = createRng(DB_RNG_SEED);
  rng.setState(db.meta.rngState);
  const result = fn(rng);
  db.meta.rngState = rng.getState();
  return result;
}

export function nextSeq(name: string): number {
  const db = getDb();
  const value = (db.meta.counters[name] ?? 0) + 1;
  db.meta.counters[name] = value;
  return value;
}

export function newId(prefix: string): string {
  return `${prefix}_${String(nextSeq(prefix)).padStart(4, "0")}`;
}

export function newToken(prefix: string): string {
  return `${prefix}_${withRng((rng) => rng.hex(32))}`;
}

export function newUuid(): string {
  return withRng((rng) => uuidFrom(rng));
}

export function currentScenarioId(): ScenarioId {
  return getDb().meta.scenario;
}
