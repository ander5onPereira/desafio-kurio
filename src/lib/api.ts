import axios, { type AxiosRequestConfig } from "axios";
import type { z } from "zod";
import { buildPath, type CallArgs, type Endpoint } from "@/contracts";
import { env } from "@/env";
import { ApiError, toApiError } from "./errors";

/**
 * Cliente HTTP único (Axios). Regras:
 *  - NENHUMA lógica de negócio e NENHUM dado/caminho fictício aqui (mocks vivem em src/mocks);
 *  - injeta credenciais via "ponte" configurada pelo módulo auth/cart (sem importá-los);
 *  - normaliza TODA falha para ApiError;
 *  - toda resposta é validada pelo schema Zod do endpoint (contrato tipado de ponta a ponta);
 *  - respostas 401 com sessão vencida disparam UM refresh compartilhado e repetem a chamada.
 */
export const api = axios.create({
  baseURL: env.VITE_API_URL,
  timeout: 15_000,
  headers: { Accept: "application/json" },
  // Arrays viram parâmetros repetidos: ?collection=a&collection=b
  paramsSerializer: { indexes: null },
});

export interface ApiBridge {
  getAccessToken(): string | null;
  getGuestCartId(): string | null;
  /** Tenta renovar a sessão. true = renovou. Chamado no máximo UMA vez por rajada de 401. */
  refreshSession(): Promise<boolean>;
  /** Sessão não pôde ser recuperada: o app deve levar o usuário ao login preservando o contexto. */
  onSessionExpired(): void;
}

const bridge: Partial<ApiBridge> = {};
/**
 * Cada módulo registra só a sua parte (auth: token/refresh/expiração; cart: id de visitante),
 * sem importar o outro. Chamar no topo do módulo (efeito de importação) ou no boot.
 */
export function configureApiBridge(next: Partial<ApiBridge>) {
  Object.assign(bridge, next);
}

const REFRESHABLE = new Set(["SESSION_EXPIRED"]);
let refreshing: Promise<boolean> | null = null;

api.interceptors.request.use((config) => {
  const token = bridge.getAccessToken?.();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  const cartId = bridge.getGuestCartId?.();
  if (cartId && !token) config.headers.set("X-Cart-Id", cartId);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const apiError = toApiError(error);
    const config = axios.isAxiosError(error) ? error.config : undefined;
    const isAuthCall = config?.url?.startsWith("/auth/") ?? false;

    if (
      apiError.status === 401 &&
      REFRESHABLE.has(apiError.code) &&
      config &&
      !isAuthCall &&
      !(config as AxiosRequestConfig & { _retried?: boolean })._retried &&
      bridge.refreshSession
    ) {
      refreshing ??= bridge.refreshSession().finally(() => {
        refreshing = null;
      });
      const renewed = await refreshing;
      if (renewed) {
        (config as AxiosRequestConfig & { _retried?: boolean })._retried = true;
        // O token novo é lido de novo pelo interceptor de request.
        config.headers?.delete?.("Authorization");
        return api.request(config);
      }
      bridge.onSessionExpired?.();
    }
    throw apiError;
  },
);

export async function callEndpoint<
  P extends string,
  B extends z.ZodType | undefined,
  Q extends z.ZodType | undefined,
  R extends z.ZodType,
>(endpoint: Endpoint<P, B, Q, R>, args: CallArgs<P, B, Q>): Promise<z.output<R>> {
  const { data } = await callEndpointRaw(endpoint, args);
  return data;
}

export async function callEndpointRaw<
  P extends string,
  B extends z.ZodType | undefined,
  Q extends z.ZodType | undefined,
  R extends z.ZodType,
>(
  endpoint: Endpoint<P, B, Q, R>,
  args: CallArgs<P, B, Q>,
): Promise<{ data: z.output<R>; status: number; headers: Record<string, string> }> {
  const { params, body, query, signal, headers } = args as {
    params?: Record<string, string>;
    body?: unknown;
    query?: unknown;
    signal?: AbortSignal;
    headers?: Record<string, string>;
  };
  try {
    const response = await api.request({
      method: endpoint.method,
      url: buildPath(endpoint.path, params),
      data: body,
      params: query,
      signal,
      headers,
    });
    const parsed = endpoint.response.safeParse(response.data === "" ? undefined : response.data);
    if (!parsed.success) {
      throw new ApiError({
        code: "INVALID_RESPONSE",
        message: "A resposta do servidor não segue o contrato esperado.",
        status: response.status,
        meta: { issues: parsed.error.issues },
      });
    }
    return {
      data: parsed.data,
      status: response.status,
      headers: Object.fromEntries(
        Object.entries(response.headers).map(([key, value]) => [key.toLowerCase(), String(value)]),
      ),
    };
  } catch (error) {
    throw toApiError(error);
  }
}
