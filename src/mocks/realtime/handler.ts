import { ws } from "msw";
import { SOCKET_PATH } from "@/contracts";
import { handleConnection } from "./broadcaster";

/**
 * Handler do websocket. Detalhes descobertos no Spike A:
 *  - o MSW REMOVE o prefixo "/socket.io/" do caminho antes de casar o link, então o padrão é "*";
 *  - por isso o handler filtra pelo caminho real e REPASSA (`server.connect()`) qualquer outra
 *    conexão (ex.: o HMR do Vite em desenvolvimento).
 */
const socketLink = ws.link("*");

export const socketHandler = socketLink.addEventListener("connection", (connection) => {
  const { pathname } = new URL(connection.client.url);
  if (!pathname.startsWith(SOCKET_PATH.replace(/\/$/, ""))) {
    connection.server.connect();
    return;
  }
  handleConnection(connection);
});
