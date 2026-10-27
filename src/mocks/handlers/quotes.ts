import { endpoints } from "@/contracts";
import { resolveCart } from "../services/cart";
import { issueQuote, normalizeQuoteInput } from "../services/quote";
import { ok, route } from "./route";

export const quoteHandlers = (base: string) => [
  route(base, endpoints.quotes.create, ({ user, guestCartId, body }) => {
    const cart = resolveCart({ user, guestCartId });
    return ok(issueQuote(cart, cart.id, normalizeQuoteInput(body)));
  }),
];
