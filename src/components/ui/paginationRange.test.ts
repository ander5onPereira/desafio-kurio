import { describe, expect, it } from "vitest";
import { getPageRange } from "./paginationRange";

describe("getPageRange", () => {
  it("mostra todas as páginas quando são poucas", () => {
    expect(getPageRange(1, 4)).toEqual([1, 2, 3, 4]);
    expect(getPageRange(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("não gera itens sem páginas", () => {
    expect(getPageRange(1, 0)).toEqual([]);
  });

  it("usa reticências só do lado em que há salto", () => {
    expect(getPageRange(1, 12)).toEqual([1, 2, "ellipsis-end", 12]);
    expect(getPageRange(12, 12)).toEqual([1, "ellipsis-start", 11, 12]);
  });

  it("mantém a página atual com vizinhas no meio", () => {
    expect(getPageRange(6, 12)).toEqual([1, "ellipsis-start", 5, 6, 7, "ellipsis-end", 12]);
  });

  it("limita página fora do intervalo", () => {
    expect(getPageRange(99, 12)).toEqual([1, "ellipsis-start", 11, 12]);
  });
});
