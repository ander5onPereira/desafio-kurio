/**
 * Garante a fronteira dos mocks: nenhum arquivo de src/ (exceto src/mocks/** e src/main.tsx)
 * pode importar src/mocks nem o pacote "msw". Complementa a regra de lint no-restricted-imports.
 * Uso: npm run check-mocks
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const SRC = path.resolve("src");
const offenders: string[] = [];

function walk(dir: string) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry)) check(full);
  }
}

function check(file: string) {
  const relative = path.relative(SRC, file).replaceAll("\\", "/");
  if (relative.startsWith("mocks/") || relative === "main.tsx") return;
  const content = readFileSync(file, "utf8");
  const importsMocks = /from\s+["'](@\/mocks|(\.{1,2}\/)+mocks)(\/[^"']*)?["']|import\(\s*["'](@\/mocks|(\.{1,2}\/)+mocks)/.test(content);
  const importsMsw = /from\s+["']msw(\/[^"']*)?["']|from\s+["']@mswjs\//.test(content);
  if (importsMocks || importsMsw) offenders.push(relative);
}

walk(SRC);

if (offenders.length > 0) {
  console.error("Fronteira dos mocks violada em:\n" + offenders.map((f) => `  - src/${f}`).join("\n"));
  process.exit(1);
}
console.info("Fronteira dos mocks OK.");
