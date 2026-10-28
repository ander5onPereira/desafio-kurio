import { toast } from "sonner";
import {
  endpoints,
  type LoginBody,
  type RegisterBody,
  type Session,
  type User,
} from "@/contracts";
import { callEndpoint, configureApiBridge } from "@/lib/api";
import { isApiError } from "@/lib/errors";
import { queryClient } from "@/lib/queryClient";
import {
  SESSION_STORAGE_KEY,
  clearPrivateStorage,
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
} from "./storage";

/**
 * Store de sessão (singleton, fora do React para o Router e o Axios poderem consultá-lo).
 *
 * - `AuthSnapshot` é imutável e só muda quando status/usuário mudam (renovar token NÃO notifica).
 * - Tokens ficam privados aqui; o resto do app só vê o snapshot.
 * - Quem precisa reagir a entrar/sair/trocar de usuário usa `subscribe` (carrinho, socket, draft).
 */
export interface AuthSnapshot {
  status: "loading" | "authenticated" | "anonymous";
  user: User | null;
  isAuthenticated: boolean;
}

export type AuthChangeReason = "restore" | "login" | "register" | "logout" | "expired";

export interface AuthChange {
  previous: AuthSnapshot;
  reason: AuthChangeReason;
}

type Listener = (snapshot: AuthSnapshot, change: AuthChange) => void;

const loadingSnapshot: AuthSnapshot = { status: "loading", user: null, isAuthenticated: false };
const anonymousSnapshot: AuthSnapshot = { status: "anonymous", user: null, isAuthenticated: false };
const authenticated = (user: User): AuthSnapshot => ({
  status: "authenticated",
  user,
  isAuthenticated: true,
});

let session: Session | null = null;
let snapshot: AuthSnapshot = anonymousSnapshot;
const listeners = new Set<Listener>();

/** Verdadeiro enquanto a sessão salva é validada no boot (falha de refresh aqui é silenciosa). */
let restoring = false;
let expiring = false;

let resolveReady!: () => void;
const readyPromise = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

function setSnapshot(next: AuthSnapshot, reason: AuthChangeReason) {
  const previous = snapshot;
  snapshot = next;
  if (previous === next) return;
  listeners.forEach((listener) => listener(snapshot, { previous, reason }));
}

/** Códigos de refresh que indicam sessão definitivamente inválida (≠ falha transitória de rede). */
const DEFINITIVE_AUTH_FAILURES = new Set(["SESSION_EXPIRED", "UNAUTHENTICATED", "FORBIDDEN"]);

async function refreshSession(): Promise<boolean> {
  if (!session) return false;
  try {
    const renewed = await callEndpoint(endpoints.auth.refresh, {
      body: { refreshToken: session.refreshToken },
    });
    if (!session) return false;
    session = { ...session, ...renewed };
    writeStoredSession(session);
    return true;
  } catch (error) {
    // Rede/5xx: deixa o erro subir (a requisição original falha, mas a sessão continua valendo).
    if (isApiError(error) && DEFINITIVE_AUTH_FAILURES.has(error.code)) return false;
    throw error;
  }
}

function dropPrivateData(options: { storages: boolean }) {
  queryClient.clear();
  if (options.storages) clearPrivateStorage();
}

async function handleSessionExpired() {
  if (restoring || expiring) return;
  expiring = true;
  try {
    session = null;
    clearStoredSession();
    // O rascunho do checkout NÃO é apagado: o usuário volta ao mesmo ponto depois de entrar de novo.
    dropPrivateData({ storages: false });
    setSnapshot(anonymousSnapshot, "expired");
    toast.warning("Sua sessão expirou", {
      description: "Entre novamente para continuar de onde parou.",
    });
    // import dinâmico: o Router importa as rotas, que importam este módulo (evita ciclo estático).
    const { router } = await import("@/router");
    const href = router.state.location.href;
    if (!/^\/(login|cadastro)(\/|\?|#|$)/.test(href)) {
      await router.navigate({ to: "/login", search: { redirect: href } });
    }
  } finally {
    expiring = false;
  }
}

async function leavePrivateRoute() {
  const { router } = await import("@/router");
  const onPrivateRoute = router.state.matches.some((match) => match.routeId.startsWith("/_auth"));
  if (onPrivateRoute) await router.navigate({ to: "/", replace: true });
}

function applySession(next: Session, reason: "login" | "register") {
  const previousUser = snapshot.user;
  session = next;
  writeStoredSession(next);
  if (previousUser && previousUser.id !== next.user.id) dropPrivateData({ storages: true });
  setSnapshot(authenticated(next.user), reason);
}

async function restore() {
  restoring = true;
  try {
    const user = await callEndpoint(endpoints.auth.me, {});
    if (session) {
      session = { ...session, user };
      writeStoredSession(session);
    }
    setSnapshot(authenticated(user), "restore");
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 403)) {
      session = null;
      clearStoredSession();
      setSnapshot(anonymousSnapshot, "restore");
    } else if (session) {
      // Sem rede/5xx: mantém o usuário salvo; as telas mostram o erro com "Tentar novamente".
      setSnapshot(authenticated(session.user), "restore");
    } else {
      setSnapshot(anonymousSnapshot, "restore");
    }
  } finally {
    restoring = false;
    resolveReady();
  }
}

export const authStore = {
  getSnapshot: (): AuthSnapshot => snapshot,
  ensureReady: async (): Promise<AuthSnapshot> => {
    await readyPromise;
    return snapshot;
  },
  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  async login(body: LoginBody): Promise<User> {
    const next = await callEndpoint(endpoints.auth.login, { body });
    applySession(next, "login");
    return next.user;
  },

  async register(body: RegisterBody): Promise<User> {
    const next = await callEndpoint(endpoints.auth.register, { body });
    applySession(next, "register");
    return next.user;
  },

  async logout(): Promise<void> {
    if (session) {
      try {
        await callEndpoint(endpoints.auth.logout, {});
      } catch {
        // Mesmo sem conseguir avisar o servidor, a sessão local termina.
      }
    }
    session = null;
    clearStoredSession();
    dropPrivateData({ storages: true });
    setSnapshot(anonymousSnapshot, "logout");
    await leavePrivateRoute();
  },
};

configureApiBridge({
  getAccessToken: () => session?.accessToken ?? null,
  refreshSession,
  onSessionExpired: () => {
    void handleSessionExpired();
  },
});

const stored = readStoredSession();
if (stored) {
  session = stored;
  snapshot = loadingSnapshot;
  void restore();
} else {
  resolveReady();
}

// Sincroniza abas: sair em uma aba encerra as outras; entrar com outro usuário recarrega.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== SESSION_STORAGE_KEY) return;
    if (event.newValue === null) {
      if (snapshot.isAuthenticated) {
        session = null;
        dropPrivateData({ storages: false });
        setSnapshot(anonymousSnapshot, "logout");
        void leavePrivateRoute();
      }
      return;
    }
    const other = readStoredSession();
    if (other && other.user.id !== snapshot.user?.id) window.location.reload();
  });
}
