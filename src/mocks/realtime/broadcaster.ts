import { toSocketIo } from "@mswjs/socket.io-binding";
import type { WebSocketHandlerConnection } from "msw";
import type { SocketEvent } from "@/contracts";
import { SOCKET_PING_INTERVAL_MS } from "../config";
import { clock } from "../lib/clock";
import { getDb, isDbReady } from "../db/store";

/**
 * Registro de clientes Socket.IO conectados ao "servidor" simulado.
 * O binding do MSW não tem rooms/broadcast, então o isolamento por usuário é feito AQUI:
 *  - o usuário é identificado pelo pacote CONNECT (`auth: { token }`) ou por `?token=` na URL;
 *  - eventos com `userScope` só vão para sockets desse usuário; os públicos (nft.updated) vão a todos;
 *  - visitantes (sem token válido) nunca recebem eventos privados.
 */
interface ClientEntry {
  id: number;
  userId: string | null;
  token: string | null;
  connection: WebSocketHandlerConnection;
  emit: (event: SocketEvent) => void;
  pingTimer: ReturnType<typeof setInterval>;
}

/** `errorWith` existe no cliente do MSW em runtime (validado no Spike A), mas não está no tipo do protocolo. */
const canErrorWith = (client: object): client is { errorWith(error?: Error): void } =>
  typeof (client as { errorWith?: unknown }).errorWith === "function";

const clients = new Set<ClientEntry>();
let blocked = false;
let nextClientId = 1;

/** Usuário dono de um access token válido (ou null). */
function userIdFromToken(token: string | null): string | null {
  if (!token || !isDbReady()) return null;
  const session = getDb().sessions[token];
  if (!session || clock.now() >= session.accessExpiresAt) return null;
  return session.userId;
}

export function handleConnection(connection: WebSocketHandlerConnection): void {
  if (blocked) {
    // Conexão recusada: o socket.io-client entra em `connect_error` e tenta de novo com backoff.
    if (canErrorWith(connection.client)) connection.client.errorWith(new Error("Conexão recusada pelo cenário."));
    else connection.client.close(1013, "recusada");
    return;
  }

  const url = new URL(connection.client.url);
  // Também sobe o handshake do Engine.IO/Socket.IO ("0{…}" e "40{…}") mockado pelo binding.
  const socketIo = toSocketIo(connection);

  const entry: ClientEntry = {
    id: nextClientId++,
    token: url.searchParams.get("token"),
    userId: null,
    connection,
    emit: (event) => socketIo.client.emit(event.type, event),
    // O Engine.IO exige ping periódico do servidor (o cliente derruba a conexão após ~30 s sem ele).
    pingTimer: setInterval(() => {
      try {
        connection.client.send("2");
      } catch {
        // conexão já fechada
      }
    }, SOCKET_PING_INTERVAL_MS),
  };
  entry.userId = userIdFromToken(entry.token);
  clients.add(entry);

  connection.client.addEventListener("message", (event) => {
    // Pacote CONNECT do Socket.IO: "40" + JSON do `auth` (ex.: 40{"token":"…"}).
    const data = typeof event.data === "string" ? event.data : "";
    const match = /^40(\{.*\})?$/.exec(data);
    if (!match?.[1]) return;
    try {
      const auth = JSON.parse(match[1]) as { token?: unknown };
      if (typeof auth.token === "string") {
        entry.token = auth.token;
        entry.userId = userIdFromToken(auth.token);
      }
    } catch {
      // auth malformado: segue como visitante
    }
  });

  connection.client.addEventListener("close", () => {
    clearInterval(entry.pingTimer);
    clients.delete(entry);
  });
}

/** Envia a todos os sockets conectados (eventos públicos). */
export function emitToAll(event: SocketEvent): void {
  for (const client of clients) client.emit(event);
}

/** Envia só aos sockets do usuário (eventos privados). */
export function emitToUser(userId: string, event: SocketEvent): void {
  for (const client of clients) if (client.userId === userId) client.emit(event);
}

/** Fecha os sockets de um token (logout): evita receber eventos de uma sessão encerrada. */
export function disconnectToken(token: string): void {
  for (const client of [...clients]) {
    if (client.token === token) client.connection.client.close(1000, "logout");
  }
}

/** Derruba todas as conexões e recusa novas até `restoreConnections()`. */
export function dropConnections(): void {
  blocked = true;
  for (const client of [...clients]) client.connection.client.close(1012, "drop");
}

export function restoreConnections(): void {
  blocked = false;
}

export const isBlocked = () => blocked;
export const connectedCount = () => clients.size;

/** Limpa o registro (reset do mock). Não fecha sockets reais: o cliente reconecta/reconcilia sozinho. */
export function resetBroadcaster(): void {
  blocked = false;
}
