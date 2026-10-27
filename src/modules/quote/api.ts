import { callEndpoint } from "@/lib/api";
import { endpoints, type QuoteRequestBody } from "@/contracts";

/** POST /quotes — cotação do carrinho atual (+cupom, +rede). */
export const requestQuote = (body: QuoteRequestBody, signal?: AbortSignal) =>
  callEndpoint(endpoints.quotes.create, { body, signal });
