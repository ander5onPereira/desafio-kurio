import type { ScenarioId } from "./scenarios";
import type { EthString } from "./common";
import type { OrderStatus } from "./orders";

/**
 * Plano de controle do servidor simulado, exposto em `window.__kurio` SOMENTE quando os mocks
 * estão ativos. Atua no "servidor" (db do MSW): o app recebe tudo pelos canais reais
 * (REST via Axios e eventos via socket.io-client). Nunca mexe na UI/cache do cliente.
 *
 * Usado por: ScenarioPanel (UI), testes Playwright (page.evaluate) e documentação (README/MOCKS).
 */
export type InjectBehavior =
  | { type: "delay"; ms: number }
  | { type: "status"; status: number; code?: string; message?: string }
  | { type: "network-error" }
  /** Nunca responde (o cliente cai por timeout). Com `afterMutation`, a operação É aplicada antes. */
  | { type: "timeout"; afterMutation?: boolean };

export interface InjectRule {
  method?: "get" | "post" | "put" | "patch" | "delete";
  /** Caminho com `:param` (ex.: "/orders") ou prefixo com "*" (ex.: "/nfts*"). */
  path: string;
  behavior: InjectBehavior;
  /** Quantas chamadas afetar (padrão: 1). `Infinity` = até limpar. */
  times?: number;
}

export interface KurioControl {
  scenario: {
    /** Troca o cenário. Por padrão RESTAURA o banco para o seed do cenário; `keepData: true` só troca o comportamento. */
    set(id: ScenarioId, options?: { keepData?: boolean }): Promise<void>;
    current(): ScenarioId;
    list(): readonly ScenarioId[];
  };
  reset(id?: ScenarioId): Promise<void>;
  inject(rule: InjectRule): void;
  clearInjections(): void;
  nft: {
    update(
      nftId: string,
      patch: { price?: EthString; available?: number; editionId?: string },
    ): Promise<{ eventId: string; version: number }>;
  };
  order: {
    settle(orderId: string, status: Exclude<OrderStatus, "pending">): Promise<void>;
  };
  socket: {
    drop(): void;
    restore(): void;
    replay(eventId: string): void;
    emitStale(nftId: string): void;
    emitted(): readonly { id: string; type: string; version: number; resourceId: string }[];
  };
  clock: {
    set(iso: string): void;
    reset(): void;
  };
}

declare global {
  interface Window {
    __kurio?: KurioControl;
  }
}
