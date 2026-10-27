import type { InjectRule, KurioControl, ScenarioId } from "@/contracts";
import { SCENARIO_IDS } from "@/contracts";
import { mutate } from "./db/store";
import { resetDb } from "./db/seed";
import { clock } from "./lib/clock";
import { dropConnections, restoreConnections } from "./realtime/broadcaster";
import { emittedSummary, replay } from "./realtime/hub";
import {
  activeScenarioId,
  addInjection,
  clearInjections,
  setActiveScenario,
} from "./scenarios/runtime";
import { emitStaleNft, updateNft } from "./services/nftAdmin";
import { settleOrder } from "./services/orders";

/**
 * Plano de controle do servidor simulado (`window.__kurio`). Implementa EXATAMENTE `KurioControl`
 * (src/contracts/control.ts). Atua no "servidor": a UI só vê o resultado pelos canais reais
 * (REST via Axios e eventos via socket.io-client).
 */
export function createControl(): KurioControl {
  return {
    scenario: {
      async set(id: ScenarioId, options?: { keepData?: boolean }) {
        setActiveScenario(id);
        if (options?.keepData) {
          mutate((db) => {
            db.meta.scenario = id;
          });
          return;
        }
        await resetDb(id);
      },
      current: () => activeScenarioId(),
      list: () => SCENARIO_IDS,
    },
    async reset(id?: ScenarioId) {
      const target = id ?? activeScenarioId();
      setActiveScenario(target);
      await resetDb(target);
    },
    inject: (rule: InjectRule) => addInjection(rule),
    clearInjections: () => clearInjections(),
    nft: {
      update: (nftId, patch) => Promise.resolve(updateNft(nftId, patch)),
    },
    order: {
      settle: (orderId, status) => {
        settleOrder(orderId, status);
        return Promise.resolve();
      },
    },
    socket: {
      drop: () => dropConnections(),
      restore: () => restoreConnections(),
      replay: (eventId) => replay(eventId),
      emitStale: (nftId) => emitStaleNft(nftId),
      emitted: () => emittedSummary(),
    },
    clock: {
      set: (iso) => clock.set(iso),
      reset: () => clock.reset(),
    },
  };
}
