import { env } from "@/env";
import { clearPersisted, loadPersisted, onDbReset, setDb } from "./db/store";
import { resetDb } from "./db/seed";
import { resetBroadcaster } from "./realtime/broadcaster";
import { clearEventLog } from "./realtime/hub";
import { isScenarioId, setActiveScenario } from "./scenarios/runtime";
import { clearOrderTimers, rescheduleSettlements } from "./services/orders";
import type { ScenarioId } from "@/contracts";

/** Tira `scenario` e `reset` da barra de endereços sem mexer nos demais parâmetros (nem no encoding deles). */
function consumeUrlParams(): void {
  const url = new URL(window.location.href);
  const pairs = url.search.slice(1).split("&");
  const kept = pairs.filter((pair) => pair !== "" && !/^(scenario|reset)(=|$)/.test(pair));
  if (kept.length === pairs.filter((pair) => pair !== "").length) return;
  url.search = kept.join("&");
  window.history.replaceState(window.history.state, "", url);
}

/**
 * Boot do servidor simulado:
 *  - cenário inicial: `?scenario=<id>` na URL > estado persistido > VITE_MOCK_SCENARIO > "default";
 *  - com estado persistido o refresh preserva sessão, carrinho, pedidos… (`?scenario=<outro>` ou
 *    `&reset=1` restauram o seed);
 *  - `scenario` e `reset` valem uma vez só: saem da URL ao serem lidos, senão o F5 (e o "Aplicar" do
 *    painel, que recarrega a página) reaplicaria o cenário da URL por cima do escolhido depois;
 *  - pedidos pendentes são reagendados: refresh nunca deixa um pedido preso.
 */
export async function initServer(search?: string): Promise<void> {
  onDbReset(() => {
    clearOrderTimers();
    clearEventLog();
    resetBroadcaster();
  });

  const params = new URLSearchParams(search ?? window.location.search);
  if (search === undefined) consumeUrlParams();
  const requested = params.get("scenario");
  const requestedId: ScenarioId | null = requested && isScenarioId(requested) ? requested : null;
  const forceReset = params.get("reset") === "1";
  const envId: ScenarioId = isScenarioId(env.VITE_MOCK_SCENARIO) ? env.VITE_MOCK_SCENARIO : "default";

  const persisted = loadPersisted();
  if (persisted && !forceReset && (!requestedId || requestedId === persisted.meta.scenario)) {
    setDb(persisted);
    setActiveScenario(persisted.meta.scenario);
    rescheduleSettlements();
    return;
  }

  if (persisted) clearPersisted();
  const scenario = requestedId ?? envId;
  setActiveScenario(scenario);
  await resetDb(scenario);
}
