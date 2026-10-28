import { delay, HttpResponse } from "msw";
import type { InjectBehavior } from "@/contracts";
import { defaultCodeForStatus, ServerError } from "../services/errors";
import { activeScenario, bump, flags, isLatencyEnabled, nextLatencyRandom, takeInjection } from "./runtime";

/**
 * Pré-processamento de TODA requisição de API, antes do handler:
 * injeções pontuais → falhas do cenário → latência. Devolve uma Response pronta (falha) ou
 * `null` para seguir ao handler. `holdAfterMutation` pede que o handler rode e a resposta nunca saia.
 */
export interface PreContext {
  method: string;
  routePattern: string;
  pathname: string;
  searchParams: URLSearchParams;
}

export interface PreResult {
  response: Response | null;
  holdAfterMutation: boolean;
}

const errorResponse = (error: ServerError) => HttpResponse.json(error.toBody(), { status: error.status });

const isAuthRoute = (pattern: string) => pattern.startsWith("/auth/");
const isPrivateRoute = (pattern: string) =>
  ["/favorites", "/wallets", "/profile", "/orders"].some((prefix) => pattern.startsWith(prefix));

async function applyBehavior(behavior: InjectBehavior): Promise<{ response?: Response; hold?: boolean }> {
  switch (behavior.type) {
    case "delay":
      await delay(behavior.ms);
      return {};
    case "status": {
      const code = (behavior.code ?? defaultCodeForStatus(behavior.status)) as ServerError["code"];
      return {
        response: errorResponse(new ServerError(behavior.status, code, behavior.message ?? "Falha injetada pelo cenário.")),
      };
    }
    case "network-error":
      return { response: HttpResponse.error() };
    case "timeout":
      if (behavior.afterMutation) return { hold: true };
      await delay("infinite");
      return {};
  }
}

function scenarioFault(ctx: PreContext): Response | null {
  const f = flags();
  if (f.offline) return HttpResponse.error();
  const key = `${ctx.method} ${ctx.routePattern}`;

  if (f.serverErrors && !isAuthRoute(ctx.routePattern)) {
    const limit = ctx.method === "get" ? f.serverErrors.reads : f.serverErrors.writes;
    const attempt = bump(`5xx:${key}`);
    if (attempt <= limit) {
      const status = attempt % 2 === 1 ? 503 : 500;
      return errorResponse(
        new ServerError(status, status === 503 ? "TRANSIENT" : "INTERNAL", "Serviço temporariamente indisponível."),
      );
    }
  }

  if (f.clientErrors && !isAuthRoute(ctx.routePattern)) {
    const table: Record<string, ServerError> = {
      "get /nfts": new ServerError(400, "VALIDATION_ERROR", "Parâmetros de busca inválidos."),
      "get /nfts/:nftId": new ServerError(403, "FORBIDDEN", "Você não tem permissão para ver este NFT."),
      "post /cart/items": new ServerError(422, "VALIDATION_ERROR", "Não foi possível adicionar o item.", {
        fieldErrors: { quantity: ["Quantidade inválida."] },
      }),
      "put /favorites/:nftId": new ServerError(403, "FORBIDDEN", "Ação não permitida."),
      "post /quotes": new ServerError(429, "RATE_LIMITED", "Muitas requisições. Tente novamente em instantes."),
      "post /orders": new ServerError(409, "CONFLICT", "Conflito ao criar o pedido."),
    };
    const error = table[key];
    if (error) return errorResponse(error);
  }

  if (f.unauthorized && isPrivateRoute(ctx.routePattern)) {
    return ctx.method === "get"
      ? errorResponse(new ServerError(401, "UNAUTHENTICATED", "Acesso não autorizado."))
      : errorResponse(new ServerError(403, "FORBIDDEN", "Você não tem permissão para esta ação."));
  }
  return null;
}

async function applyLatency(ctx: PreContext): Promise<void> {
  if (!isLatencyEnabled()) return;
  const f = flags();
  if (f.outOfOrder && ctx.method === "get" && ctx.routePattern === "/nfts") {
    const n = bump("ooo:/nfts");
    await delay(n % 2 === 1 ? 1_800 : 80);
    return;
  }
  const policy = activeScenario().latency;
  if (policy.kind === "none") return;
  if (policy.kind === "fixed") {
    await delay(policy.ms);
    return;
  }
  await delay(Math.round(policy.min + nextLatencyRandom() * (policy.max - policy.min)));
}

export async function applyPre(ctx: PreContext): Promise<PreResult> {
  let hold = false;

  const injected = takeInjection(ctx.method, ctx.routePattern, ctx.pathname);
  if (injected) {
    const outcome = await applyBehavior(injected.behavior);
    if (outcome.response) return { response: outcome.response, holdAfterMutation: false };
    if (outcome.hold) hold = true;
  }

  const fault = scenarioFault(ctx);
  if (fault) return { response: fault, holdAfterMutation: false };

  await applyLatency(ctx);
  return { response: null, holdAfterMutation: hold };
}
