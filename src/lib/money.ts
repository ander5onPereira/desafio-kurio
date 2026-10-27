import Decimal from "decimal.js";
import type { EthString } from "@/contracts";

/**
 * Aritmética de ETH com precisão decimal. NUNCA usar `number` para dinheiro.
 * Todas as funções recebem/retornam strings decimais (o formato do contrato).
 * O total OFICIAL vem da cotação da API; estas funções servem para exibir e conferir.
 */
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

const toDecimal = (value: string | Decimal) => new Decimal(value);

/** Remove zeros à direita mantendo uma string decimal canônica ("1.500" → "1.5", "2.0" → "2"). */
const canonical = (value: Decimal): EthString => value.toFixed().replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");

export const ZERO_ETH: EthString = "0";

export function addEth(a: string, b: string): EthString {
  return canonical(toDecimal(a).plus(b));
}

export function subEth(a: string, b: string): EthString {
  return canonical(toDecimal(a).minus(b));
}

/** Preço unitário × quantidade inteira. */
export function mulEth(unit: string, quantity: number): EthString {
  if (!Number.isInteger(quantity)) throw new Error("Quantidade deve ser inteira");
  return canonical(toDecimal(unit).times(quantity));
}

export function sumEth(values: readonly string[]): EthString {
  return canonical(values.reduce((acc, value) => acc.plus(value), new Decimal(0)));
}

/** -1 | 0 | 1 */
export function compareEth(a: string, b: string): -1 | 0 | 1 {
  return toDecimal(a).comparedTo(b) as -1 | 0 | 1;
}

export const isZeroEth = (value: string) => toDecimal(value).isZero();

interface FormatOptions {
  /** Mínimo de casas decimais (padrão 2: "1.19", "2.00"). */
  minFraction?: number;
  /** Máximo de casas (padrão 18). Zeros à direita além do mínimo são cortados. */
  maxFraction?: number;
}

/**
 * Formata o número como no Figma: mínimo de 2 casas e sem zeros supérfluos
 * (1.19 → "1.19", 26.846 → "26.846", 0.016 → "0.016", 2 → "2.00").
 * Usa ponto decimal (padrão do layout). Não inclui o sufixo "ETH".
 */
export function formatEth(value: string, { minFraction = 2, maxFraction = 18 }: FormatOptions = {}): string {
  const decimal = toDecimal(value);
  const fixed = decimal.toFixed(maxFraction, Decimal.ROUND_HALF_UP);
  const [intPart = "0", fracPart = ""] = fixed.split(".");
  let frac = fracPart.replace(/0+$/, "");
  if (frac.length < minFraction) frac = frac.padEnd(minFraction, "0");
  return frac ? `${intPart}.${frac}` : intPart;
}

/** "1.19 ETH" */
export const formatEthWithUnit = (value: string, options?: FormatOptions) => `${formatEth(value, options)} ETH`;
