/**
 * Auditoria Lighthouse (README §10): Início e Detalhe × mobile e desktop, 3 medições cada,
 * reportando a MEDIANA de Performance/Accessibility/Best Practices/SEO e de LCP/CLS/TBT.
 *
 * Fluxo: build `demo` (mocks ligados) → `vite preview` → Lighthouse (um Chrome limpo por medição,
 * sem estado de execuções anteriores) → relatórios em reports/lighthouse/.
 *
 * Uso: npm run lh
 * Variáveis: LH_SKIP_BUILD=1 (reaproveita a pasta de build), LH_DIST (pasta do build; padrão dist),
 * LH_PORT (porta do preview), LH_URL=http://host:porta (audita um servidor já no ar e não sobe o
 * preview), CHROME_PATH (usa outro Chrome; padrão = Chromium do Playwright).
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";
import { LIGHTHOUSE_CONFIG, type CategoryId, type ProfileId } from "./lighthouse.config";

const VITE_BIN = path.resolve("node_modules/vite/bin/vite.js");

interface RunResult {
  scores: Record<CategoryId, number>;
  lcp: number;
  cls: number;
  tbt: number;
  fcp: number;
  json: string;
  html: string;
  chromeVersion: string;
  lighthouseVersion: string;
  throttling: string;
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${command} ${args.join(" ")} saiu com ${code}`))));
  });
}

async function waitForServer(url: string, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      /* servidor ainda subindo */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Servidor não respondeu em ${url}`);
}

async function measure(url: string, profile: ProfileId): Promise<RunResult> {
  const chrome = await chromeLauncher.launch({
    chromePath: process.env.CHROME_PATH ?? chromium.executablePath(),
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
  });
  try {
    const desktopConfig = profile === "desktop" ? (await import("lighthouse/core/config/desktop-config.js")).default : undefined;
    const result = await lighthouse(
      url,
      {
        port: chrome.port,
        output: ["html", "json"],
        logLevel: "error",
        onlyCategories: [...LIGHTHOUSE_CONFIG.categories],
      },
      desktopConfig,
    );
    if (!result) throw new Error("Lighthouse não retornou resultado");

    const { lhr } = result;
    const [html, json] = result.report as string[];
    const score = (id: CategoryId) => Math.round((lhr.categories[id]?.score ?? 0) * 100);
    const audit = (id: string) => lhr.audits[id]?.numericValue ?? Number.NaN;
    const throttling = lhr.configSettings.throttling;
    return {
      scores: {
        performance: score("performance"),
        accessibility: score("accessibility"),
        "best-practices": score("best-practices"),
        seo: score("seo"),
      },
      lcp: audit("largest-contentful-paint"),
      cls: audit("cumulative-layout-shift"),
      tbt: audit("total-blocking-time"),
      fcp: audit("first-contentful-paint"),
      html: html ?? "",
      json: json ?? "",
      chromeVersion: lhr.environment.hostUserAgent,
      lighthouseVersion: lhr.lighthouseVersion,
      throttling: `${lhr.configSettings.throttlingMethod} (RTT ${throttling.rttMs} ms, ${Math.round(throttling.throughputKbps)} Kbps, CPU ${throttling.cpuSlowdownMultiplier}x)`,
    };
  } finally {
    await chrome.kill();
  }
}

const fmtMs = (value: number) => `${Math.round(value)} ms`;
const fmtCls = (value: number) => value.toFixed(3);

async function main() {
  const { pages, profiles, runs, categories, targets, outputDir, port } = LIGHTHOUSE_CONFIG;
  const external = process.env.LH_URL;
  const baseUrl = external ?? `http://localhost:${port}`;
  let server: ChildProcess | undefined;

  if (!external) {
    const dist = process.env.LH_DIST ?? "dist";
    if (!process.env.LH_SKIP_BUILD) await run(process.execPath, [VITE_BIN, "build", "--mode", "demo", "--outDir", dist, "--emptyOutDir"]);
    server = spawn(process.execPath, [VITE_BIN, "preview", "--outDir", dist, "--port", String(port), "--strictPort"], { stdio: "ignore" });
  }

  try {
    await waitForServer(baseUrl);
    await mkdir(outputDir, { recursive: true });

    const summaryRows: string[] = [];
    const detailRows: string[] = [];
    const all: Record<string, unknown> = {};
    let meta: Pick<RunResult, "chromeVersion" | "lighthouseVersion" | "throttling"> | undefined;

    for (const page of pages) {
      for (const profile of profiles) {
        const url = `${baseUrl}${page.path}`;
        const results: RunResult[] = [];
        for (let index = 1; index <= runs; index++) {
          console.info(`▶ ${page.label} · ${profile} · medição ${index}/${runs}`);
          results.push(await measure(url, profile));
        }
        meta ??= results[0];

        const med = (pick: (r: RunResult) => number) => median(results.map(pick));
        const scores = Object.fromEntries(categories.map((id) => [id, med((r) => r.scores[id])])) as Record<CategoryId, number>;
        const medians = { lcp: med((r) => r.lcp), cls: med((r) => r.cls), tbt: med((r) => r.tbt), fcp: med((r) => r.fcp) };

        const ordered = [...results].sort((a, b) => a.scores.performance - b.scores.performance);
        const representative = ordered[Math.floor(ordered.length / 2)]!;
        const base = path.join(outputDir, `${page.id}-${profile}`);
        await writeFile(`${base}.html`, representative.html);
        await writeFile(`${base}.json`, representative.json);

        all[`${page.id}-${profile}`] = { url, runs: results.map(({ scores: s, lcp, cls, tbt, fcp }) => ({ scores: s, lcp, cls, tbt, fcp })), medians: { scores, ...medians } };

        const cell = (id: CategoryId) => `${scores[id]} ${scores[id] >= targets[id] ? "✅" : "❌"}`;
        summaryRows.push(`| ${page.label} | ${profile} | ${cell("performance")} | ${cell("accessibility")} | ${cell("best-practices")} | ${cell("seo")} |`);
        detailRows.push(`| ${page.label} | ${profile} | ${fmtMs(medians.lcp)} | ${fmtCls(medians.cls)} | ${fmtMs(medians.tbt)} | ${fmtMs(medians.fcp)} | ${results.map((r) => r.scores.performance).join(" / ")} |`);
      }
    }

    await writeFile(path.join(outputDir, "results.json"), JSON.stringify(all, null, 2));

    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as { devDependencies?: Record<string, string> };
    const cpus = os.cpus();
    const summary = `# Lighthouse — resultados

Gerado em ${new Date().toISOString()} por \`npm run lh\` (script: \`scripts/lighthouse.ts\`, config: \`scripts/lighthouse.config.ts\`).

## Pontuação (mediana de ${runs} medições)

| Página | Perfil | Performance (≥${targets.performance}) | Accessibility (≥${targets.accessibility}) | Best Practices (≥${targets["best-practices"]}) | SEO (≥${targets.seo}) |
| --- | --- | ---: | ---: | ---: | ---: |
${summaryRows.join("\n")}

## Métricas de carga (mediana)

| Página | Perfil | LCP | CLS | TBT | FCP | Performance por medição |
| --- | --- | ---: | ---: | ---: | ---: | --- |
${detailRows.join("\n")}

## Ambiente e condições de execução

- **Alvo:** build \`demo\` otimizado (\`vite build --mode demo\`, mocks MSW ligados, cenário padrão), servido por \`vite preview\` em ${baseUrl}
- **Medições:** ${runs} por página e perfil; cada uma com um Chrome novo (sem cache nem Service Worker de execuções anteriores)
- **Ferramentas:** Lighthouse ${meta?.lighthouseVersion ?? "?"} (pacote ${packageJson.devDependencies?.lighthouse ?? "?"}) · Chrome: ${meta?.chromeVersion ?? "?"} · Node ${process.version}
- **Sistema:** ${os.platform()} ${os.release()} (${os.arch()}) · CPU: ${cpus[0]?.model.trim() ?? "?"} × ${cpus.length} · RAM: ${(os.totalmem() / 1024 ** 3).toFixed(1)} GB
- **Throttling (mobile):** ${meta?.throttling ?? "?"}; o perfil desktop usa o preset desktop do Lighthouse
- **Relatórios completos:** \`${outputDir}/<pagina>-<perfil>.html|json\` (execução mediana) e \`${outputDir}/results.json\` (todas as medições)

> Resultados abaixo da meta devem ser justificados em \`docs/PERFORMANCE.md\` (causas, não simplificações da página).
`;
    await writeFile(path.join(outputDir, "summary.md"), summary);
    console.info(`\n✔ Relatórios em ${outputDir}/ (summary.md, results.json, HTML/JSON por página e perfil)`);
  } finally {
    server?.kill();
  }
}

await main();
