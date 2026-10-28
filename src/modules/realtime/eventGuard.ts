import type { SocketEvent } from "@/contracts";

/**
 * Guarda de eventos Socket.IO (PLANO §6.3). Decide se um evento deve ser aplicado:
 *  - `foreign`   → o evento é de OUTRO usuário (`userScope` ≠ usuário atual): nunca aplica;
 *  - `duplicate` → o `id` já foi visto (entrega duplicada / replay): ignora, sem reaplicar efeitos;
 *  - `stale`     → `version` ≤ a última versão conhecida do recurso: evento antigo, não regride;
 *  - `apply`     → aceita e registra id + versão.
 *
 * Pura e sem dependências de React (testável). O conjunto de ids é um LRU de tamanho fixo.
 */
export type GuardVerdict = "apply" | "duplicate" | "stale" | "foreign";

export const resourceKey = (event: Pick<SocketEvent, "resource">) => `${event.resource.kind}:${event.resource.id}`;

export class EventGuard {
  private readonly seenIds = new Set<string>();
  private readonly versions = new Map<string, number>();

  constructor(private readonly maxIds = 500) {}

  check(event: SocketEvent, currentUserId: string | null): GuardVerdict {
    if (event.userScope && event.userScope !== currentUserId) return "foreign";
    if (this.seenIds.has(event.id)) return "duplicate";
    this.remember(event.id);

    const key = resourceKey(event);
    const known = this.versions.get(key);
    if (known !== undefined && event.version <= known) return "stale";
    this.versions.set(key, event.version);
    return "apply";
  }

  versionOf(key: string): number | undefined {
    return this.versions.get(key);
  }

  noteVersion(key: string, version: number): void {
    const known = this.versions.get(key);
    if (known === undefined || version > known) this.versions.set(key, version);
  }

  reset(): void {
    this.seenIds.clear();
    this.versions.clear();
  }

  private remember(id: string) {
    this.seenIds.add(id);
    if (this.seenIds.size > this.maxIds) {
      const oldest = this.seenIds.values().next().value;
      if (oldest !== undefined) this.seenIds.delete(oldest);
    }
  }
}
