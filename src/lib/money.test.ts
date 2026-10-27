import { describe, expect, it } from "vitest";
import { addEth, compareEth, formatEth, formatEthWithUnit, mulEth, subEth, sumEth } from "./money";

describe("money", () => {
  it("soma sem erro de ponto flutuante", () => {
    expect(addEth("0.1", "0.2")).toBe("0.3");
    expect(sumEth(["2.38", "8.34", "16.11"])).toBe("26.83");
  });

  it("multiplica preço unitário por quantidade inteira", () => {
    expect(mulEth("1.19", 2)).toBe("2.38");
    expect(mulEth("1.39", 6)).toBe("8.34");
    expect(mulEth("1.79", 9)).toBe("16.11");
  });

  it("rejeita quantidade não inteira", () => {
    expect(() => mulEth("1.19", 1.5)).toThrow();
  });

  it("preserva 18 casas decimais", () => {
    expect(addEth("0.000000000000000001", "0.000000000000000002")).toBe("0.000000000000000003");
  });

  it("subtrai e compara", () => {
    expect(subEth("26.846", "0.016")).toBe("26.83");
    expect(compareEth("1.19", "1.2")).toBe(-1);
    expect(compareEth("1.2", "1.20")).toBe(0);
  });

  it("formata como no Figma (mínimo 2 casas, sem zeros supérfluos)", () => {
    expect(formatEth("1.19")).toBe("1.19");
    expect(formatEth("26.846")).toBe("26.846");
    expect(formatEth("0.016")).toBe("0.016");
    expect(formatEth("2")).toBe("2.00");
    expect(formatEth("0")).toBe("0.00");
    expect(formatEth("26.830")).toBe("26.83");
    expect(formatEthWithUnit("1.19")).toBe("1.19 ETH");
  });
});
