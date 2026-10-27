import type { z } from "zod";

/**
 * Registro tipado de endpoints REST. UMA definição alimenta:
 *  - o cliente (lib/api.ts → `callEndpoint`): monta a URL, valida a resposta com Zod;
 *  - os handlers MSW (src/mocks): mesma rota, mesmo schema de body/query/response.
 * Assim o contrato nunca diverge entre front e "servidor".
 */
export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

/**
 * Autenticação do endpoint:
 *  - public: nunca exige token;
 *  - optional: aceita visitante (carrinho/cotação usam o header X-Cart-Id);
 *  - required: 401 sem token válido.
 */
export type AuthMode = "public" | "optional" | "required";

/** Extrai os nomes dos parâmetros de rota: "/nfts/:nftId/x" → "nftId". */
export type PathParamNames<P extends string> =
  P extends `${string}:${infer Name}/${infer Rest}`
    ? Name | PathParamNames<`/${Rest}`>
    : P extends `${string}:${infer Name}`
      ? Name
      : never;

type OptionalSchema = z.ZodType | undefined;

export interface Endpoint<
  P extends string = string,
  B extends OptionalSchema = OptionalSchema,
  Q extends OptionalSchema = OptionalSchema,
  R extends z.ZodType = z.ZodType,
> {
  readonly method: HttpMethod;
  /** Caminho relativo à base da API, com parâmetros no estilo `:id` (igual ao MSW). */
  readonly path: P;
  readonly auth: AuthMode;
  readonly body?: B;
  readonly query?: Q;
  readonly response: R;
  readonly description: string;
}

export function defineEndpoint<
  const P extends string,
  B extends OptionalSchema = undefined,
  Q extends OptionalSchema = undefined,
  R extends z.ZodType = z.ZodType,
>(endpoint: Endpoint<P, B, Q, R>): Endpoint<P, B, Q, R> {
  return endpoint;
}

/** Argumentos de `callEndpoint`: só exige `params`/`body`/`query` quando o endpoint declara. */
export type CallArgs<P extends string, B extends OptionalSchema, Q extends OptionalSchema> = {
  signal?: AbortSignal;
  headers?: Record<string, string>;
} & ([PathParamNames<P>] extends [never]
  ? { params?: undefined }
  : { params: Record<PathParamNames<P>, string> }) &
  ([B] extends [z.ZodType] ? { body: z.input<B> } : { body?: undefined }) &
  ([Q] extends [z.ZodType] ? { query: z.input<Q> } : { query?: undefined });

/** Substitui `:param` por valores codificados. */
export function buildPath(path: string, params?: Record<string, string>): string {
  return path.replace(/:([A-Za-z0-9_]+)/g, (_, name: string) => {
    const value = params?.[name];
    if (value === undefined) throw new Error(`Parâmetro de rota ausente: ${name} em ${path}`);
    return encodeURIComponent(value);
  });
}
