import { describe, expect, it } from "vitest";
import { applyPatch, catalogSearchSchema, normalizeSearch, toApiQuery } from "./searchParams";

describe("catalogSearchSchema", () => {
  it("normaliza valores que o Router entrega como número/array", () => {
    const parsed = catalogSearchSchema.parse({ q: 2024, collection: "arte-digital", network: ["polygon", "xpto"], page: "3" });
    expect(parsed.q).toBe("2024");
    expect(parsed.collection).toEqual(["arte-digital"]);
    expect(parsed.network).toEqual(["polygon"]);
    expect(parsed.page).toBe(3);
  });

  it("descarta valores inválidos em vez de falhar", () => {
    const parsed = catalogSearchSchema.parse({ sort: "caro", tab: 9, page: -4, minPrice: "abc" });
    expect(parsed).toEqual({});
  });

  it("aceita preços decimais como string", () => {
    expect(catalogSearchSchema.parse({ minPrice: 0.5, maxPrice: "12.30" })).toEqual({ minPrice: "0.5", maxPrice: "12.30" });
  });
});

describe("applyPatch / normalizeSearch", () => {
  it("reinicia a paginação a cada mudança de filtro", () => {
    const next = applyPatch({ page: 4, q: "ape" }, { network: ["polygon"] });
    expect(next).toEqual({ q: "ape", network: ["polygon"] });
  });

  it("respeita a troca explícita de página", () => {
    expect(applyPatch({ q: "ape" }, { page: 3 })).toEqual({ q: "ape", page: 3 });
  });

  it("mantém a URL limpa (omite padrões e vazios)", () => {
    expect(normalizeSearch({ sort: "recent", tab: "all", page: 1, q: "", collection: [] })).toEqual({});
  });

  it("combina filtros", () => {
    const step1 = applyPatch({}, { collection: ["arte-digital"] });
    const step2 = applyPatch(step1, { network: ["ethereum"], sort: "price-asc" });
    expect(step2).toEqual({ collection: ["arte-digital"], network: ["ethereum"], sort: "price-asc" });
  });
});

describe("toApiQuery", () => {
  it("envia à API exatamente o que está na URL", () => {
    expect(toApiQuery({ q: "ape", network: ["polygon"], page: 2, sort: "price-desc" })).toEqual({
      pageSize: 9,
      q: "ape",
      network: ["polygon"],
      page: 2,
      sort: "price-desc",
    });
  });
});
