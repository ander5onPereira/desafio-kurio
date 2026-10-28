import type { AvailabilityConflictMeta, Quote } from "@/contracts";
import { compareEth } from "@/lib/money";

/**
 * Máquina de estados do checkout (PLANO §5.6). Pura: sem React, sem rede, sem storage.
 *
 *   editing ──REVIEW──▶ reviewing ──SUBMIT──▶ submitting ──SUBMITTED──▶ completed
 *      ▲                  │  ▲                    │
 *      │                  │  └──RECONFIRM─────────┤ QUOTE_CHANGED / AVAILABILITY_CONFLICT
 *      └──────EDIT────────┴── needsReconfirm ◀────┘            (+ LIVE_QUOTE com revisão diferente = STALE)
 *                                                │
 *                          SUBMIT_UNKNOWN (timeout/queda) ──▶ recovering ──SUBMIT (MESMA chave)──▶ submitting
 *
 * Regras que a máquina garante:
 *  - não se edita o formulário enquanto o envio está em voo (submitting/recovering);
 *  - após QUOTE_CHANGED / STALE o usuário PRECISA confirmar de novo (RECONFIRM é um clique explícito);
 *  - `recovering` só aceita reenvio (a mesma Idempotency-Key recupera o mesmo pedido).
 */
export type ConflictItem = AvailabilityConflictMeta["items"][number];
export type ReconfirmReason = "QUOTE_CHANGED" | "STALE" | "AVAILABILITY_CONFLICT";

export type CheckoutState =
  | { status: "editing" }
  | { status: "reviewing"; reviewed: Quote }
  | { status: "submitting"; reviewed: Quote }
  | { status: "recovering"; reviewed: Quote; message: string }
  | {
      status: "needsReconfirm";
      reviewed: Quote;
      latest: Quote | null;
      reason: ReconfirmReason;
      conflicts: ConflictItem[];
    }
  | { status: "completed"; orderId: string };

export type CheckoutEvent =
  | { type: "REVIEW"; quote: Quote }
  | { type: "EDIT" }
  | { type: "SUBMIT" }
  | { type: "SUBMITTED"; orderId: string }
  | { type: "SUBMIT_UNKNOWN"; message: string }
  | { type: "SUBMIT_REJECTED" }
  | { type: "QUOTE_CHANGED"; latest: Quote }
  | { type: "AVAILABILITY_CONFLICT"; conflicts: ConflictItem[]; latest?: Quote | null }
  | { type: "LIVE_QUOTE"; quote: Quote }
  | { type: "RECONFIRM" }
  | { type: "RESTORE_IN_FLIGHT"; reviewed: Quote }
  | { type: "RESET" };

export const initialCheckoutState: CheckoutState = { status: "editing" };

export function checkoutReducer(state: CheckoutState, event: CheckoutEvent): CheckoutState {
  switch (event.type) {
    case "RESET":
      return initialCheckoutState;

    case "RESTORE_IN_FLIGHT":
      // Refresh com envio em voo: o resultado é desconhecido → só resta reenviar com a mesma chave.
      return {
        status: "recovering",
        reviewed: event.reviewed,
        message: "Retomamos o seu envio. Verifique o pedido para continuar.",
      };

    case "REVIEW":
      return state.status === "editing" ? { status: "reviewing", reviewed: event.quote } : state;

    case "EDIT":
      return state.status === "reviewing" || state.status === "needsReconfirm" ? initialCheckoutState : state;

    case "SUBMIT":
      return state.status === "reviewing" || state.status === "recovering"
        ? { status: "submitting", reviewed: state.reviewed }
        : state;

    case "SUBMITTED":
      return state.status === "submitting" ? { status: "completed", orderId: event.orderId } : state;

    case "SUBMIT_UNKNOWN":
      return state.status === "submitting"
        ? { status: "recovering", reviewed: state.reviewed, message: event.message }
        : state;

    case "SUBMIT_REJECTED":
      return state.status === "submitting" ? { status: "reviewing", reviewed: state.reviewed } : state;

    case "QUOTE_CHANGED":
      return state.status === "submitting"
        ? { status: "needsReconfirm", reviewed: state.reviewed, latest: event.latest, reason: "QUOTE_CHANGED", conflicts: [] }
        : state;

    case "AVAILABILITY_CONFLICT":
      return state.status === "submitting"
        ? {
            status: "needsReconfirm",
            reviewed: state.reviewed,
            latest: event.latest ?? null,
            reason: "AVAILABILITY_CONFLICT",
            conflicts: event.conflicts,
          }
        : state;

    case "LIVE_QUOTE": {
      // Cotação "viva" (recalculada por evento/refetch). Só importa enquanto o usuário não enviou.
      if (state.status === "reviewing" && event.quote.revision !== state.reviewed.revision) {
        return { status: "needsReconfirm", reviewed: state.reviewed, latest: event.quote, reason: "STALE", conflicts: [] };
      }
      if (state.status === "needsReconfirm" && event.quote.revision !== state.latest?.revision) {
        return { ...state, latest: event.quote };
      }
      return state;
    }

    case "RECONFIRM":
      if (state.status !== "needsReconfirm") return state;
      return state.latest ? { status: "reviewing", reviewed: state.latest } : initialCheckoutState;

    default:
      return state;
  }
}

export const isSubmitBlocked = (state: CheckoutState): boolean =>
  state.status === "needsReconfirm" || state.status === "submitting" || state.status === "completed";

export interface QuoteLineDiff {
  itemId: string;
  name: string;
  editionLabel: string;
  quantity: number;
  priceFrom: string | null;
  priceTo: string | null;
  priceChanged: boolean;
  unavailable: boolean;
}

export interface QuoteDiff {
  lines: QuoteLineDiff[];
  totalFrom: string;
  totalTo: string;
  totalChanged: boolean;
  feeChanged: boolean;
  discountChanged: boolean;
  hasChanges: boolean;
}

export function diffQuotes(before: Quote, after: Quote): QuoteDiff {
  const afterById = new Map(after.lines.map((line) => [line.itemId, line]));
  const lines: QuoteLineDiff[] = before.lines.map((line) => {
    const next = afterById.get(line.itemId);
    const unavailable = !next || next.status === "unavailable";
    const priceChanged = !!next && compareEth(line.unitPrice, next.unitPrice) !== 0;
    return {
      itemId: line.itemId,
      name: line.name,
      editionLabel: line.editionLabel,
      quantity: next?.quantity ?? line.quantity,
      priceFrom: line.unitPrice,
      priceTo: next ? next.unitPrice : null,
      priceChanged,
      unavailable,
    };
  });
  const totalChanged = compareEth(before.total, after.total) !== 0;
  const feeChanged = compareEth(before.networkFee, after.networkFee) !== 0;
  const discountChanged = compareEth(before.discount.amount, after.discount.amount) !== 0;
  return {
    lines,
    totalFrom: before.total,
    totalTo: after.total,
    totalChanged,
    feeChanged,
    discountChanged,
    hasChanges: totalChanged || feeChanged || discountChanged || lines.some((line) => line.priceChanged || line.unavailable),
  };
}
