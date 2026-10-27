import type { SocketEvent } from "@/contracts";
import { emitToAll, emitToUser } from "./broadcaster";

/**
 * Ponto ÚNICO de publicação de eventos. Toda mutação do banco que o front deva enxergar passa por
 * aqui, então REST e Socket.IO nunca divergem. Mantém um log (para replay, duplicatas e testes).
 */
interface LoggedEvent {
  event: SocketEvent;
  /** userId do destinatário; null = todos. */
  audience: string | null;
}

const MAX_LOG = 500;
let log: LoggedEvent[] = [];

export function publish(event: SocketEvent): void {
  log.push({ event, audience: event.userScope ?? null });
  if (log.length > MAX_LOG) log = log.slice(-MAX_LOG);
  if (event.userScope) emitToUser(event.userScope, event);
  else emitToAll(event);
}

export const eventLog = (): readonly LoggedEvent[] => log;
export const clearEventLog = (): void => {
  log = [];
};

/** Reenvia um evento já emitido, IDÊNTICO (mesmo id) — simula duplicata. */
export function replay(eventId: string): void {
  const found = log.find((entry) => entry.event.id === eventId);
  if (!found) throw new Error(`Evento ${eventId} não encontrado no log`);
  if (found.audience) emitToUser(found.audience, found.event);
  else emitToAll(found.event);
}

export function emittedSummary() {
  return log.map(({ event }) => ({
    id: event.id,
    type: event.type,
    version: event.version,
    resourceId: event.resource.id,
  }));
}
