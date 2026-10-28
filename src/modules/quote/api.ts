import { callEndpoint } from "@/lib/api";
import { endpoints, type QuoteRequestBody } from "@/contracts";

export const requestQuote = (body: QuoteRequestBody, signal?: AbortSignal) =>
  callEndpoint(endpoints.quotes.create, { body, signal });
