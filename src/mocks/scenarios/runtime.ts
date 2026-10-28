import type { InjectRule, ScenarioId } from "@/contracts";
import { SCENARIO_IDS } from "@/contracts";
import { getDb, isDbReady } from "../db/store";
import { createRng, type Rng } from "../lib/prng";
import { SCENARIOS, type ScenarioDef, type ScenarioFlags } from "./definitions";

/**
 * Estado de execução dos cenários (em memória): cenário ativo, contadores por rota, "one-shots"
 * já consumidos, injeções pontuais e o PRNG de latência. É zerado a cada reset/troca de cenário,
 * o que torna cada cenário reproduzível a partir do início.
 */
interface InjectionEntry {
  rule: InjectRule;
  remaining: number;
}

interface Runtime {
  scenario: ScenarioId;
  counters: Map<string, number>;
  injections: InjectionEntry[];
  latencyRng: Rng;
}

const LATENCY_SEED = 0x1a7e;

function createRuntime(scenario: ScenarioId): Runtime {
  return {
    scenario,
    counters: new Map(),
    injections: [],
    latencyRng: createRng(LATENCY_SEED),
  };
}

let runtime = createRuntime("default");
let latencyEnabled = true;

/** Liga/desliga a latência BASE dos cenários (testes unitários rodam sem esperar). Não afeta injeções. */
export const setLatencyEnabled = (enabled: boolean): void => {
  latencyEnabled = enabled;
};
export const isLatencyEnabled = (): boolean => latencyEnabled;

export const isScenarioId = (value: string): value is ScenarioId => (SCENARIO_IDS as readonly string[]).includes(value);

export function setActiveScenario(id: ScenarioId, options: { keepInjections?: boolean } = {}): void {
  const previous = runtime.injections;
  runtime = createRuntime(id);
  if (options.keepInjections) runtime.injections = previous;
  if (isDbReady()) {
    // "Uma vez por reset" vive no banco (persiste em refresh); trocar de cenário rearma.
    const counters = getDb().meta.counters;
    for (const key of Object.keys(counters)) if (key.startsWith("once:")) delete counters[key];
    getDb().meta.scenario = id;
  }
}

export const activeScenarioId = (): ScenarioId => runtime.scenario;
export const activeScenario = (): ScenarioDef => SCENARIOS[runtime.scenario];
export const flags = (): ScenarioFlags => SCENARIOS[runtime.scenario].flags;

export function bump(key: string): number {
  const value = (runtime.counters.get(key) ?? 0) + 1;
  runtime.counters.set(key, value);
  return value;
}

export function consumeOnce(key: string): boolean {
  const counters = getDb().meta.counters;
  const stored = `once:${key}`;
  if (counters[stored]) return false;
  counters[stored] = 1;
  return true;
}

export function nextLatencyRandom(): number {
  return runtime.latencyRng.next();
}

export function addInjection(rule: InjectRule): void {
  runtime.injections.push({ rule, remaining: rule.times ?? 1 });
}

export function clearInjections(): void {
  runtime.injections = [];
}

export const listInjections = (): readonly InjectRule[] => runtime.injections.map((entry) => entry.rule);

const matchesPath = (rulePath: string, routePattern: string, actualPath: string): boolean => {
  if (rulePath.endsWith("*")) {
    const prefix = rulePath.slice(0, -1);
    return routePattern.startsWith(prefix) || actualPath.startsWith(prefix);
  }
  return rulePath === routePattern || rulePath === actualPath;
};

export function takeInjection(method: string, routePattern: string, actualPath: string): InjectRule | null {
  const index = runtime.injections.findIndex(
    (entry) =>
      entry.remaining > 0 &&
      (!entry.rule.method || entry.rule.method === method) &&
      matchesPath(entry.rule.path, routePattern, actualPath),
  );
  if (index === -1) return null;
  const entry = runtime.injections[index]!;
  entry.remaining -= 1;
  return entry.rule;
}
