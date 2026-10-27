import { delay, http, HttpResponse, type HttpHandler } from "msw";
import type { z } from "zod";
import type { Endpoint, PathParamNames } from "@/contracts";
import type { DbUser } from "../db/types";
import { applyPre } from "../scenarios/pre";
import { authenticate } from "../services/auth";
import { ServerError, unauthenticated } from "../services/errors";

/**
 * Cola entre um endpoint do contrato e o MSW. Para cada rota:
 *  1. aplica o cenário (injeções, falhas, latência);
 *  2. autentica conforme `ep.auth`;
 *  3. valida body/query com os schemas do contrato (422 com fieldErrors);
 *  4. executa o resolver (serviços de domínio) — `ServerError` vira o corpo de erro padrão;
 *  5. valida a RESPOSTA contra o schema do contrato (o mock não pode violar o contrato).
 */
export interface Reply<T> {
  status?: number;
  body?: T;
  headers?: Record<string, string>;
}

export interface RouteContext<P extends string, B, Q> {
  request: Request;
  url: URL;
  params: Record<PathParamNames<P>, string>;
  body: B;
  query: Q;
  user: DbUser | null;
  /** Usuário autenticado (as rotas `required` já garantem; lança 401 se faltar). */
  requireUser(): DbUser;
  /** Valor do header X-Cart-Id (carrinho de visitante). */
  guestCartId: string | null;
  /** access token usado na requisição (para o logout). */
  accessToken: string | null;
  /** Cenário order-timeout: aplica a operação, mas a resposta nunca sai. */
  holdResponse(): void;
}

type Out<S> = S extends z.ZodType ? z.output<S> : undefined;

export interface RouteOptions {
  /** Converte a query string em objeto antes de validar (padrão: pares chave/valor; repetidos viram array). */
  parseQuery?: (searchParams: URLSearchParams) => unknown;
}

function defaultParseQuery(searchParams: URLSearchParams): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(searchParams.keys())) {
    const all = searchParams.getAll(key);
    out[key] = all.length > 1 ? all : (all[0] ?? "");
  }
  return out;
}

function issuesToFieldErrors(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

const errorResponse = (error: ServerError) => HttpResponse.json(error.toBody(), { status: error.status });

export function route<
  P extends string,
  B extends z.ZodType | undefined,
  Q extends z.ZodType | undefined,
  R extends z.ZodType,
>(
  apiBase: string,
  endpoint: Endpoint<P, B, Q, R>,
  resolver: (ctx: RouteContext<P, Out<B>, Out<Q>>) => Reply<z.input<R>> | Promise<Reply<z.input<R>>>,
  options: RouteOptions = {},
): HttpHandler {
  return http[endpoint.method](`${apiBase}${endpoint.path}`, async ({ request, params }) => {
    const url = new URL(request.url);
    const basePath = new URL(apiBase, url.origin).pathname.replace(/\/$/, "");
    const pathname = url.pathname.startsWith(basePath) ? url.pathname.slice(basePath.length) : url.pathname;

    const pre = await applyPre({
      method: endpoint.method,
      routePattern: endpoint.path,
      pathname,
      searchParams: url.searchParams,
    });
    if (pre.response) return pre.response;

    try {
      const auth = endpoint.auth === "public" ? null : authenticate(request.headers.get("authorization"));
      if (endpoint.auth === "required" && !auth) throw unauthenticated();

      let body: unknown;
      if (endpoint.body) {
        const raw: unknown = await request.json().catch(() => ({}));
        const parsed = endpoint.body.safeParse(raw);
        if (!parsed.success) {
          throw new ServerError(422, "VALIDATION_ERROR", "Verifique os campos informados.", {
            fieldErrors: issuesToFieldErrors(parsed.error),
          });
        }
        body = parsed.data;
      }

      let query: unknown;
      if (endpoint.query) {
        const raw = (options.parseQuery ?? defaultParseQuery)(url.searchParams);
        const parsed = endpoint.query.safeParse(raw);
        if (!parsed.success) {
          throw new ServerError(400, "VALIDATION_ERROR", "Parâmetros inválidos.", {
            fieldErrors: issuesToFieldErrors(parsed.error),
          });
        }
        query = parsed.data;
      }

      let hold = pre.holdAfterMutation;
      const reply = await resolver({
        request,
        url,
        params: Object.fromEntries(
          Object.entries(params).map(([key, value]) => [key, decodeURIComponent(String(value))]),
        ) as Record<PathParamNames<P>, string>,
        body: body as Out<B>,
        query: query as Out<Q>,
        user: auth?.user ?? null,
        requireUser: () => {
          if (!auth) throw unauthenticated();
          return auth.user;
        },
        guestCartId: request.headers.get("x-cart-id"),
        accessToken: auth?.session.accessToken ?? null,
        holdResponse: () => {
          hold = true;
        },
      });

      if (hold) {
        // A operação foi aplicada no "servidor", mas o cliente nunca recebe a resposta.
        await delay("infinite");
      }

      const status = reply.status ?? 200;
      if (status === 204) return new HttpResponse(null, { status, headers: reply.headers });

      const checked = endpoint.response.safeParse(reply.body);
      if (!checked.success) {
        console.error(`[mock] resposta fora do contrato em ${endpoint.method.toUpperCase()} ${endpoint.path}`, checked.error.issues);
        return errorResponse(new ServerError(500, "INTERNAL", "O servidor simulado violou o contrato da API."));
      }
      return HttpResponse.json(checked.data as Record<string, unknown>, { status, headers: reply.headers });
    } catch (error) {
      if (error instanceof ServerError) return errorResponse(error);
      console.error("[mock] erro inesperado", error);
      return errorResponse(new ServerError(500, "INTERNAL", "Erro interno do servidor simulado."));
    }
  });
}

export const ok = <T>(body: T, headers?: Record<string, string>): Reply<T> => ({ status: 200, body, headers });
export const created = <T>(body: T): Reply<T> => ({ status: 201, body });
export const noContent = (): Reply<unknown> => ({ status: 204 });
