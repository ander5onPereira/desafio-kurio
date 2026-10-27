/**
 * Valida o contraste (WCAG) dos pares de tokens de src/styles/tokens.css.
 * Falha (exit 1) se algum par de TEXTO ficar abaixo de 4.5:1.
 * Uso: npm run contrast
 */
import { readFileSync } from "node:fs";

const css = readFileSync("src/styles/tokens.css", "utf8");
const root = css.slice(css.indexOf(":root"), css.indexOf("}", css.indexOf(":root")));
const tokens = new Map<string, string>();
for (const match of root.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})\b/g)) {
  tokens.set(match[1]!, match[2]!);
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

/** [texto, fundo, mínimo]. 4.5 = texto normal; 3 = componente/texto grande. */
const PAIRS: Array<[string, string, number]> = [
  ["foreground", "background", 4.5],
  ["foreground", "card", 4.5],
  ["foreground", "surface-strip", 4.5],
  ["muted-foreground", "background", 4.5],
  ["muted-foreground", "card", 4.5],
  ["muted-foreground", "surface-strip", 4.5],
  ["subtle-foreground", "background", 4.5],
  ["subtle-foreground", "card", 4.5],
  ["accent-foreground", "background", 4.5],
  ["accent-foreground", "card", 4.5],
  ["accent-foreground", "surface-strip", 4.5],
  ["primary", "background", 4.5],
  ["primary", "card", 4.5],
  ["primary-foreground", "primary", 4.5],
  ["primary-foreground", "primary-hover", 4.5],
  ["primary-foreground", "primary-pressed", 4.5],
  ["danger", "background", 4.5],
  ["danger", "card", 4.5],
  ["danger", "danger-surface", 4.5],
  ["success", "background", 4.5],
  ["success", "success-surface", 4.5],
  ["warning", "background", 4.5],
  ["warning", "warning-surface", 4.5],
  ["info", "background", 4.5],
  ["info", "info-surface", 4.5],
  ["ring", "background", 3],
  ["border", "background", 1.2],
];

let failed = 0;
for (const [fg, bg, min] of PAIRS) {
  const fgHex = tokens.get(fg);
  const bgHex = tokens.get(bg);
  if (!fgHex || !bgHex) {
    console.error(`✖ token ausente: ${fg} ou ${bg}`);
    failed++;
    continue;
  }
  const value = ratio(fgHex, bgHex);
  const ok = value >= min;
  if (!ok) failed++;
  console.info(`${ok ? "✔" : "✖"} ${fg.padEnd(18)} / ${bg.padEnd(16)} ${value.toFixed(2)}:1 (mín. ${min})`);
}

if (failed > 0) {
  console.error(`\n${failed} par(es) abaixo do mínimo. Ajuste os tokens em src/styles/tokens.css e documente em ARCHITECTURE.md.`);
  process.exit(1);
}
console.info("\nContraste OK.");
