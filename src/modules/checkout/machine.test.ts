import { describe, expect, it } from "vitest";
import type { Quote } from "@/contracts";
import { checkoutReducer, diffQuotes, initialCheckoutState, isSubmitBlocked, type CheckoutState } from "./machine";

function quote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: "q1",
    revision: "r1",
    createdAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-01-01T00:10:00.000Z",
    lines: [
      {
        itemId: "n1:e1",
        nftId: "n1",
        editionId: "e1",
        name: "Emerald Ape #042",
        tokenId: "0042",
        editionLabel: "1/50",
        image: { key: "emerald", alt: "Macaco" },
        quantity: 2,
        unitPrice: "1.19",
        lineTotal: "2.38",
        available: 10,
        status: "ok",
      },
    ],
    subtotal: "2.38",
    discount: { label: "Desconto do lançamento", amount: "0", couponCode: null },
    networkFee: "0.016",
    feeEstimated: true,
    total: "2.396",
    network: "ethereum",
    warnings: [],
    purchasable: true,
    ...overrides,
  };
}

const run = (events: Parameters<typeof checkoutReducer>[1][], from: CheckoutState = initialCheckoutState) =>
  events.reduce(checkoutReducer, from);

describe("máquina do checkout", () => {
  it("fluxo feliz: editing → reviewing → submitting → completed", () => {
    const state = run([{ type: "REVIEW", quote: quote() }, { type: "SUBMIT" }, { type: "SUBMITTED", orderId: "o1" }]);
    expect(state).toEqual({ status: "completed", orderId: "o1" });
  });

  it("não envia sem revisar", () => {
    expect(run([{ type: "SUBMIT" }]).status).toBe("editing");
  });

  it("timeout após o envio entra em recovering e só aceita reenvio", () => {
    const recovering = run([{ type: "REVIEW", quote: quote() }, { type: "SUBMIT" }, { type: "SUBMIT_UNKNOWN", message: "queda" }]);
    expect(recovering.status).toBe("recovering");
    // Editar durante a recuperação é bloqueado (evita nova chave e compra duplicada).
    expect(checkoutReducer(recovering, { type: "EDIT" }).status).toBe("recovering");
    expect(checkoutReducer(recovering, { type: "SUBMIT" }).status).toBe("submitting");
  });

  it("QUOTE_CHANGED exige reconfirmação explícita e usa a cotação nova", () => {
    const latest = quote({ id: "q2", revision: "r2", total: "2.5" });
    const state = run([{ type: "REVIEW", quote: quote() }, { type: "SUBMIT" }, { type: "QUOTE_CHANGED", latest }]);
    expect(state.status).toBe("needsReconfirm");
    expect(isSubmitBlocked(state)).toBe(true);
    expect(checkoutReducer(state, { type: "SUBMIT" }).status).toBe("needsReconfirm");
    const reconfirmed = checkoutReducer(state, { type: "RECONFIRM" });
    expect(reconfirmed).toEqual({ status: "reviewing", reviewed: latest });
  });

  it("cotação viva diferente durante a revisão marca STALE e bloqueia", () => {
    const state = run([{ type: "REVIEW", quote: quote() }, { type: "LIVE_QUOTE", quote: quote({ revision: "r9", total: "3" }) }]);
    expect(state).toMatchObject({ status: "needsReconfirm", reason: "STALE" });
  });

  it("cotação viva com a MESMA revisão não muda nada", () => {
    const state = run([{ type: "REVIEW", quote: quote() }, { type: "LIVE_QUOTE", quote: quote() }]);
    expect(state.status).toBe("reviewing");
  });

  it("conflito de estoque sem cotação nova volta a editing ao reconfirmar", () => {
    const state = run([
      { type: "REVIEW", quote: quote() },
      { type: "SUBMIT" },
      { type: "AVAILABILITY_CONFLICT", conflicts: [{ nftId: "n1", editionId: "e1", name: "Emerald Ape #042", requested: 2, available: 0 }] },
    ]);
    expect(state).toMatchObject({ status: "needsReconfirm", reason: "AVAILABILITY_CONFLICT" });
    expect(checkoutReducer(state, { type: "RECONFIRM" }).status).toBe("editing");
  });

  it("falha definitiva do envio volta para a revisão", () => {
    const state = run([{ type: "REVIEW", quote: quote() }, { type: "SUBMIT" }, { type: "SUBMIT_REJECTED" }]);
    expect(state.status).toBe("reviewing");
  });

  it("refresh com envio em voo retoma em recovering", () => {
    expect(checkoutReducer(initialCheckoutState, { type: "RESTORE_IN_FLIGHT", reviewed: quote() }).status).toBe("recovering");
  });
});

describe("diffQuotes", () => {
  it("detecta mudança de preço e de total", () => {
    const before = quote();
    const after = quote({
      revision: "r2",
      total: "2.876",
      lines: [{ ...quote().lines[0]!, unitPrice: "1.43", lineTotal: "2.86" }],
    });
    const diff = diffQuotes(before, after);
    expect(diff.hasChanges).toBe(true);
    expect(diff.totalChanged).toBe(true);
    expect(diff.lines[0]).toMatchObject({ priceFrom: "1.19", priceTo: "1.43", priceChanged: true });
  });

  it("linha que sumiu fica indisponível", () => {
    const diff = diffQuotes(quote(), quote({ revision: "r2", lines: [] }));
    expect(diff.lines[0]?.unavailable).toBe(true);
  });

  it("cotações iguais não têm mudanças", () => {
    expect(diffQuotes(quote(), quote()).hasChanges).toBe(false);
  });
});
