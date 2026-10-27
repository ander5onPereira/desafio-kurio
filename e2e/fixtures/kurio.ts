import type { Page } from "@playwright/test";
import type { InjectRule, ScenarioId } from "../../src/contracts";

/**
 * Cliente do control plane do servidor simulado (`window.__kurio`).
 *
 * Por que via `page.evaluate`: o MSW roda DENTRO da página (service worker + interceptação de
 * WebSocket), então o `APIRequestContext` do Playwright (que fala direto com a rede) NÃO passa por
 * ele. O control plane atua no "servidor" (db do mock); o app recebe tudo pelos canais reais
 * (Axios e socket.io-client) — nunca mexemos em estado/cache da UI.
 */
export class KurioClient {
  constructor(private readonly page: Page) {}

  /** Abre uma rota já com o cenário desejado (`?scenario=`) e espera o control plane subir. */
  async open(path = "/", scenario?: ScenarioId): Promise<void> {
    const url = new URL(path, "http://kurio.local");
    if (scenario) url.searchParams.set("scenario", scenario);
    await this.page.goto(`${url.pathname}${url.search}${url.hash}`);
    await this.ready();
  }

  /**
   * Executa uma ação e espera a RESPOSTA da API (método + trecho do caminho). Garante que a mutation
   * terminou antes do próximo passo (ex.: recarregar a página), sem tempo fixo.
   */
  async afterResponse<T>(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", pathPart: string, action: () => Promise<T>): Promise<T> {
    const response = this.page.waitForResponse((r) => r.request().method() === method && r.url().includes(`/api${pathPart}`));
    const result = await action();
    await response;
    return result;
  }

  /** Espera o MSW e o control plane estarem disponíveis. */
  async ready(): Promise<void> {
    await this.page.waitForFunction(() => Boolean(window.__kurio));
  }

  /** Troca o cenário. Por padrão o servidor RESTAURA o banco (sessões, carrinhos…); `keepData` só muda o comportamento. */
  async setScenario(id: ScenarioId, options?: { keepData?: boolean }): Promise<void> {
    await this.page.evaluate(([scenario, opts]) => window.__kurio!.scenario.set(scenario, opts), [id, options] as const);
  }

  async currentScenario(): Promise<ScenarioId> {
    return this.page.evaluate(() => window.__kurio!.scenario.current());
  }

  /** Volta o banco do mock ao seed (do cenário informado ou do atual). */
  async reset(id?: ScenarioId): Promise<void> {
    await this.page.evaluate((scenario) => window.__kurio!.reset(scenario), id);
  }

  /** Falha/atraso pontual ("as próximas N chamadas") sem trocar de cenário. */
  async inject(rule: InjectRule): Promise<void> {
    await this.page.evaluate((value) => window.__kurio!.inject(value), rule);
  }

  async clearInjections(): Promise<void> {
    await this.page.evaluate(() => window.__kurio!.clearInjections());
  }

  /**
   * Consulta o "servidor" (MSW) como o usuário logado: serve para provar o RESULTADO das operações
   * (ex.: quantos pedidos existem), sem depender só do que a tela mostra. Passa pelo MSW porque
   * o fetch roda dentro da página.
   */
  async serverFetch<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<{ status: number; json: T }> {
    // Se a página estiver navegando (contexto de execução destruído), espera carregar e tenta de novo.
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.serverFetchOnce<T>(path, init);
      } catch (error) {
        const navigating = error instanceof Error && error.message.includes("Execution context was destroyed");
        if (!navigating || attempt >= 3) throw error;
        await this.page.waitForLoadState("load");
      }
    }
  }

  private async serverFetchOnce<T>(path: string, init: { method?: string; body?: unknown }): Promise<{ status: number; json: T }> {
    return this.page.evaluate(
      async ([url, options]) => {
        const stored = localStorage.getItem("kurio.session");
        const token = stored ? (JSON.parse(stored) as { accessToken?: string }).accessToken : undefined;
        const response = await fetch(`/api${url}`, {
          method: options.method ?? "GET",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
        });
        return { status: response.status, json: (await response.json().catch(() => null)) as never };
      },
      [path, init] as const,
    ) as Promise<{ status: number; json: T }>;
  }

  /** Altera preço/estoque NO SERVIDOR; o evento `nft.updated` chega pelo socket.io-client. */
  async updateNft(
    nftId: string,
    patch: { price?: string; available?: number; editionId?: string },
  ): Promise<{ eventId: string; version: number }> {
    return this.page.evaluate(([id, change]) => window.__kurio!.nft.update(id, change), [nftId, patch] as const);
  }

  /** Conclui um pedido pendente (emite `order.updated`). */
  async settleOrder(orderId: string, status: "confirmed" | "declined"): Promise<void> {
    await this.page.evaluate(([id, result]) => window.__kurio!.order.settle(id, result), [orderId, status] as const);
  }

  async dropSocket(): Promise<void> {
    await this.page.evaluate(() => window.__kurio!.socket.drop());
  }

  async restoreSocket(): Promise<void> {
    await this.page.evaluate(() => window.__kurio!.socket.restore());
  }

  /** Reenvia um evento já emitido (duplicata). */
  async replayEvent(eventId: string): Promise<void> {
    await this.page.evaluate((id) => window.__kurio!.socket.replay(id), eventId);
  }

  /** Reenvia um evento com versão ANTIGA do mesmo NFT (evento obsoleto). */
  async emitStale(nftId: string): Promise<void> {
    await this.page.evaluate((id) => window.__kurio!.socket.emitStale(id), nftId);
  }

  async emittedEvents() {
    return this.page.evaluate(() => window.__kurio!.socket.emitted());
  }

  async setServerClock(iso: string): Promise<void> {
    await this.page.evaluate((value) => window.__kurio!.clock.set(value), iso);
  }

  async resetServerClock(): Promise<void> {
    await this.page.evaluate(() => window.__kurio!.clock.reset());
  }
}
