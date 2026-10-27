import type { LoginBody, RefreshResponse, RegisterBody, Session, User } from "@/contracts";
import { ACCESS_TTL_MS, REFRESH_TTL_MS } from "../config";
import { getDb, mutate, newId, newToken } from "../db/store";
import type { DbSession, DbUser } from "../db/types";
import { clock } from "../lib/clock";
import { hashPassword, verifyPassword } from "../lib/password";
import { disconnectToken } from "../realtime/broadcaster";
import { flags } from "../scenarios/runtime";
import { ServerError, sessionExpired, unauthenticated } from "./errors";

/** Sessão: tokens opacos (access curto + refresh com rotação). Senhas só como PBKDF2 + sal. */
export interface AuthContext {
  user: DbUser;
  session: DbSession;
}

export function toUserDto(user: DbUser): User {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    ensName: user.ensName,
    walletNickname: user.walletNickname,
    createdAt: user.createdAt,
  };
}

/** Valida o header Authorization. Sem header → null. Token desconhecido → 401; vencido → SESSION_EXPIRED. */
export function authenticate(authorization: string | null): AuthContext | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match?.[1]) throw unauthenticated("Credenciais inválidas.");
  const db = getDb();
  const session = db.sessions[match[1]];
  if (!session) throw unauthenticated("Sessão inválida. Entre novamente.");
  if (clock.now() >= session.accessExpiresAt) throw sessionExpired();
  const user = db.users[session.userId];
  if (!user) throw unauthenticated("Usuário não encontrado.");
  return { user, session };
}

function issueSession(userId: string): DbSession {
  const now = clock.now();
  const ttl = flags().accessTtlMs ?? ACCESS_TTL_MS;
  const session: DbSession = {
    accessToken: newToken("kat"),
    refreshToken: newToken("krt"),
    userId,
    accessExpiresAt: now + ttl,
    refreshExpiresAt: now + REFRESH_TTL_MS,
    createdAt: now,
  };
  getDb().sessions[session.accessToken] = session;
  return session;
}

const toSessionDto = (session: DbSession, user: DbUser): Session => ({
  accessToken: session.accessToken,
  refreshToken: session.refreshToken,
  expiresAt: new Date(session.accessExpiresAt).toISOString(),
  user: toUserDto(user),
});

export async function register(body: RegisterBody): Promise<Session> {
  const email = body.email.trim().toLowerCase();
  const username = body.username.trim().toLowerCase();
  const db = getDb();
  const users = Object.values(db.users);

  if (flags().registerConflict || users.some((u) => u.email === email)) {
    throw new ServerError(409, "EMAIL_TAKEN", "Este e-mail já está cadastrado.", {
      fieldErrors: { email: ["Este e-mail já está cadastrado."] },
    });
  }
  if (users.some((u) => u.username === username)) {
    throw new ServerError(409, "USERNAME_TAKEN", "Este nome de usuário já está em uso.", {
      fieldErrors: { username: ["Este nome de usuário já está em uso."] },
    });
  }

  const salt = newToken("salt").slice(5, 37);
  const passwordHash = await hashPassword(body.password, salt);
  return mutate((state) => {
    const id = newId("usr");
    const user: DbUser = {
      id,
      username,
      displayName: username,
      email,
      passwordHash,
      salt,
      avatarUrl: null,
      ensName: null,
      walletNickname: null,
      createdAt: clock.iso(),
    };
    state.users[id] = user;
    state.favorites[id] = [];
    return toSessionDto(issueSession(id), user);
  });
}

export async function login(body: LoginBody): Promise<Session> {
  const email = body.email.trim().toLowerCase();
  const user = Object.values(getDb().users).find((u) => u.email === email);
  const valid = user ? await verifyPassword(body.password, user.salt, user.passwordHash) : false;
  if (!user || !valid) throw unauthenticated("E-mail ou senha inválidos.");
  return mutate(() => toSessionDto(issueSession(user.id), user));
}

/** Rotação do refresh: o par antigo morre; reutilizar um refresh já rotacionado = SESSION_EXPIRED. */
export function refresh(refreshToken: string): RefreshResponse {
  if (flags().refreshAlwaysFails) throw sessionExpired();
  const db = getDb();
  const current = Object.values(db.sessions).find((s) => s.refreshToken === refreshToken);
  if (!current || clock.now() >= current.refreshExpiresAt) throw sessionExpired();
  return mutate((state) => {
    delete state.sessions[current.accessToken];
    disconnectToken(current.accessToken);
    const next = issueSession(current.userId);
    return {
      accessToken: next.accessToken,
      refreshToken: next.refreshToken,
      expiresAt: new Date(next.accessExpiresAt).toISOString(),
    };
  });
}

export function logout(accessToken: string): void {
  mutate((state) => {
    delete state.sessions[accessToken];
  });
  disconnectToken(accessToken);
}
