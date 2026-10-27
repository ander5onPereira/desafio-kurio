import { useMemo, useSyncExternalStore } from "react";
import type { LoginBody, RegisterBody, User } from "@/contracts";
import { authStore, type AuthSnapshot } from "./authStore";

export interface AuthApi extends AuthSnapshot {
  login(body: LoginBody): Promise<User>;
  register(body: RegisterBody): Promise<User>;
  logout(): Promise<void>;
}

const actions = {
  login: (body: LoginBody) => authStore.login(body),
  register: (body: RegisterBody) => authStore.register(body),
  logout: () => authStore.logout(),
};

/** Estado da sessão + ações. O snapshot só muda quando status/usuário mudam. */
export function useAuth(): AuthApi {
  const snapshot = useSyncExternalStore(authStore.subscribe, authStore.getSnapshot, authStore.getSnapshot);
  return useMemo(() => ({ ...snapshot, ...actions }), [snapshot]);
}
