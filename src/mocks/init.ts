import { env } from "@/env";
import { clearPersisted, loadPersisted, onDbReset, setDb } from "./db/store";
import { resetDb } from "./db/seed";
import { resetBroadcaster } from "./realtime/broadcaster";
import { clearEventLog } from "./realtime/hub";
import { isScenarioId, setActiveScenario } from "./scenarios/runtime";
import { clearOrderTimers, rescheduleSettlements } from "./services/orders";
import type { ScenarioId } from "@/contracts";

/**
 * Boot do servidor simulado:
 *  - cenário inicial: `?scenario=<id>` na URL > estado persistido > VITE_MOCK_SCENARIO > "default";
 *  - com estado persistido o refresh preserva sessão, carrinho, pedidos… (`?scenario=<outro>` ou
 *    `&reset=1` restauram o seed);
 *  - pedidos pendentes são reagendados: refresh nunca deixa um pedido preso.
 */
export async function initServer(search: string = window.location.search): Promise<void> {
  // Reset do banco → limpa timers, log de eventos e bloqueio do websocket.
  onDbReset(() => {
    clearOrderTimers();
    clearEventLog();
    resetBroadcaster();
  });

  const params = new URLSearchParams(search);
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
