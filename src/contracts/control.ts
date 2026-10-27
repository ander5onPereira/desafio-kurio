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
  /** Atrasa a resposta em `ms`. */
  | { type: "delay"; ms: number }
  /** Responde com HTTP `status` (+ `code` opcional do contrato de erros). */
  | { type: "status"; status: number; code?: string; message?: string }
  /** Falha de conexão (sem resposta). */
  | { type: "network-error" }
  /** Nunca responde (o cliente cai por timeout). Com `afterMutation`, a operação É aplicada antes. */
  | { type: "timeout"; afterMutation?: boolean };

export interface InjectRule {
  /** Método HTTP em minúsculas; omitido = qualquer. */
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
  /** Restaura o banco do mock para o seed do cenário (limpa sessões, carrinhos, pedidos…). */
  reset(id?: ScenarioId): Promise<void>;
  inject(rule: InjectRule): void;
  clearInjections(): void;
  nft: {
    /** Altera o NFT NO SERVIDOR: preço e/ou disponibilidade; emite `nft.updated` pelo socket. */
    update(
      nftId: string,
      patch: { price?: EthString; available?: number; editionId?: string },
    ): Promise<{ eventId: string; version: number }>;
  };
  order: {
    /** Conclui um pedido pendente (emite `order.updated`). */
    settle(orderId: string, status: Exclude<OrderStatus, "pending">): Promise<void>;
  };
  socket: {
    /** Derruba a conexão websocket (o cliente tenta reconectar). */
    drop(): void;
    /** Permite reconectar depois de `drop()`. */
    restore(): void;
    /** Reenvia um evento já emitido (duplicata). */
    replay(eventId: string): void;
    /** Reenvia um evento com versão ANTIGA do mesmo recurso (evento obsoleto). */
    emitStale(nftId: string): void;
    /** Ids dos eventos emitidos até agora (para os testes referenciarem). */
    emitted(): readonly { id: string; type: string; version: number; resourceId: string }[];
  };
  clock: {
    /** Define o "agora" do servidor simulado (expiração de token/cotação). */
    set(iso: string): void;
    reset(): void;
  };
}

declare global {
  interface Window {
    __kurio?: KurioControl;
  }
}
