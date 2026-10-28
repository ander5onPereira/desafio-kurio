import Decimal from "decimal.js";
import type { EthString } from "@/contracts";

/**
 * Aritmética de servidor que o lib/money.ts do app não cobre (percentuais, fator). Mesmo motor
 * (decimal.js) e mesma regra: strings decimais, nunca number.
 */
const canonical = (value: Decimal): EthString =>
  value.toFixed().replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");

export function percentOf(value: string, percent: number): EthString {
  return canonical(new Decimal(value).times(percent).div(100).toDecimalPlaces(18));
}

export function scaleEth(value: string, factor: number, divisor: number, places = 2): EthString {
  return canonical(new Decimal(value).times(factor).div(divisor).toDecimalPlaces(places));
}

export function shiftEth(value: string, delta: string): EthString {
  return canonical(new Decimal(value).plus(delta));
}

export const maxZero = (value: string): EthString => (new Decimal(value).isNegative() ? "0" : canonical(new Decimal(value)));
