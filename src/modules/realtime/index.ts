/*
  Cliente de tempo real (Agente D). API pública (outros agentes dependem dela):
    useConnectionStatus(): "connected" | "reconnecting" | "offline"   // indicador discreto no layout
    useRealtime(): void                                                // montado UMA vez no root
  Detalhes: PLANO §6. Eventos: src/contracts/events.ts.
*/
export type { ConnectionStatus } from "./connection";
export { useConnectionStatus, useRealtime } from "./useRealtime";
