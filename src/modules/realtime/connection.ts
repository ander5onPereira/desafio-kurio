import type { Socket } from "socket.io-client";
import { sessionSchema, SOCKET_EVENT_TYPES, SOCKET_PATH, socketEventSchema, type SocketEvent } from "@/contracts";
import { queryClient } from "@/lib/queryClient";
import { scopeOf } from "@/lib/queryKeys";
import { authStore } from "@/modules/auth";
import { applyEvent, type ApplyEffects } from "./applyEvent";
import { EventGuard } from "./eventGuard";
import { nftFloors } from "./nftState";

/**
 * Conexão Socket.IO (singleton). Responsabilidades:
 *  - transporte SOMENTE websocket (o binding do MSW não suporta long-polling), namespace padrão, sem acks;
 *  - o `socket.io-client` é carregado por import DINÂMICO dentro de connect(): o engine.io captura
 *    `globalThis.WebSocket` ao ser avaliado, então precisa vir DEPOIS de o MSW instalar a interceptação
 *    (src/main.tsx só renderiza o app depois de `enableMocks()`); também tira o cliente do bundle inicial;
 *  - ref-count: conecta quando o 1º consumidor chama `acquire()` e desconecta quando o último solta;
 *  - identidade: conecta como visitante (eventos `nft.updated` valem para todos) ou com o token do
 *    usuário (necessário para `order.updated`). Ao sair/trocar de usuário a conexão é RECRIADA,
 *    o guard é zerado e os listeners antigos são removidos — nada da sessão anterior sobrevive;
 *  - reconexão: ao reconectar, reconcilia os recursos ativos com a API REST (eventos perdidos);
 *  - cada evento passa por: validação Zod → EventGuard (escopo/duplicata/versão) → applyEvent.
 */
export type ConnectionStatus = "connected" | "reconnecting" | "offline";

const SESSION_KEY = "kurio.session";

/** Token de acesso atual, lido da sessão persistida (o auth guarda a renovação ali). */
function readAccessToken(): string | undefined {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return undefined;
    const parsed = sessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data.accessToken : undefined;
  } catch {
    return undefined;
  }
}

class RealtimeConnection {
  private socket: Socket | null = null;
  private refs = 0;
  private status: ConnectionStatus = "offline";
  private readonly statusListeners = new Set<() => void>();
  private readonly guard = new EventGuard();
  private effects: ApplyEffects | null = null;
  private hasConnectedBefore = false;
  private releaseTimer: ReturnType<typeof setTimeout> | null = null;
  private identity: string | null | undefined = undefined;
  /** Descarta resultados de imports/conexões antigas quando a identidade muda no meio do caminho. */
  private generation = 0;

  /** Efeitos (toast/anúncio) registrados pelo hook; ficam fora para o núcleo seguir testável. */
  setEffects(effects: ApplyEffects) {
    this.effects = effects;
  }

  getStatus = (): ConnectionStatus => this.status;

  subscribeStatus = (listener: () => void): (() => void) => {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  };

  /** Registra um consumidor. Devolve a função que o libera (use no cleanup do efeito). */
  acquire(): () => void {
    this.refs += 1;
    if (this.releaseTimer) {
      clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }
    this.syncWithAuth();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.refs -= 1;
      // Adia um tick: o StrictMode monta/desmonta/monta e não deve derrubar a conexão à toa.
      this.releaseTimer = setTimeout(() => {
        if (this.refs <= 0) this.teardown();
      }, 0);
    };
  }

  /** Reavalia a identidade: (re)conecta quando o usuário muda; derruba se ninguém mais usa. */
  syncWithAuth() {
    const snapshot = authStore.getSnapshot();
    if (snapshot.status === "loading") return;
    const identity = snapshot.user?.id ?? null;
    if (this.refs <= 0) return;
    if (this.socket && identity === this.identity) return;
    this.connect(identity);
  }

  private connect(identity: string | null) {
    this.teardown();
    this.identity = identity;
    this.guard.reset();
    this.hasConnectedBefore = false;
    const generation = ++this.generation;
    this.setStatus("reconnecting");

    void import("socket.io-client").then(({ io }) => {
      if (generation !== this.generation || this.refs <= 0) return;

      const socket = io(window.location.origin, {
        path: SOCKET_PATH,
        transports: ["websocket"],
        autoConnect: false,
        reconnection: true,
        reconnectionDelay: 500,
        reconnectionDelayMax: 4000,
        randomizationFactor: 0,
        // O token é lido a CADA (re)conexão (pode ter sido renovado). Visitante = sem token.
        auth: (callback) => callback(identity ? { token: readAccessToken() } : {}),
      });
      this.socket = socket;

      socket.on("connect", () => {
        const isReconnect = this.hasConnectedBefore;
        this.hasConnectedBefore = true;
        this.setStatus("connected");
        // Eventos podem ter sido perdidos durante a queda: reconcilia o que está na tela com o REST.
        if (isReconnect) this.reconcileWithRest();
      });
      socket.on("disconnect", (reason) => {
        // "io client disconnect" = fomos nós (logout/teardown): fica offline sem tentar reconectar.
        this.setStatus(reason === "io client disconnect" ? "offline" : "reconnecting");
      });
      socket.on("connect_error", () => this.setStatus("reconnecting"));
      socket.io.on("reconnect_attempt", () => this.setStatus("reconnecting"));
      for (const type of SOCKET_EVENT_TYPES) socket.on(type, (raw: unknown) => this.handle(raw));

      socket.connect();
    });
  }

  private handle(raw: unknown) {
    const parsed = socketEventSchema.safeParse(raw);
    if (!parsed.success) return; // evento fora do contrato: ignora (nunca quebra a UI)
    const event: SocketEvent = parsed.data;
    const userId = authStore.getSnapshot().user?.id ?? null;
    const verdict = this.guard.check(event, userId);
    if (verdict !== "apply") return;
    if (!this.effects) return;
    applyEvent({ queryClient, scope: scopeOf(userId), effects: this.effects }, event);
  }

  /** Reconciliação após reconexão: refaz as consultas ATIVAS (catálogo, detalhe, carrinho, cotação, pedido). */
  private reconcileWithRest() {
    void queryClient.invalidateQueries({ refetchType: "active" });
  }

  private setStatus(next: ConnectionStatus) {
    if (this.status === next) return;
    this.status = next;
    this.statusListeners.forEach((listener) => listener());
  }

  /** Remove listeners e fecha a conexão (sem deixar nada da sessão anterior). */
  private teardown() {
    this.generation += 1; // invalida qualquer import/conexão em andamento
    const socket = this.socket;
    if (!socket) return;
    this.socket = null;
    socket.removeAllListeners();
    socket.io.removeAllListeners();
    socket.disconnect();
    this.guard.reset();
    this.setStatus("offline");
  }

  /** Só para testes/diagnóstico: quantos listeners de evento estão registrados. */
  debugListenerCount(): number {
    const socket = this.socket;
    if (!socket) return 0;
    return SOCKET_EVENT_TYPES.reduce((sum, type) => sum + socket.listeners(type).length, 0);
  }
}

export const realtime = new RealtimeConnection();

// Troca de usuário / logout / expiração → recria a conexão com a nova identidade.
authStore.subscribe(() => realtime.syncWithAuth());

// Limpa o piso de NFTs ao sair (não é privado, mas evita estado órfão entre sessões de teste).
authStore.subscribe((_snapshot, change) => {
  if (change.reason === "logout") nftFloors.clear();
});
