import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright — E2E contra o build `demo` (o mesmo que será publicado), com os mocks (MSW) ligados.
 *
 *  - Padrão: `npm run build:demo && vite preview` na 4173 (testa o que vai para produção).
 *  - Desenvolvimento rápido: `E2E_DEV=1 npx playwright test` usa `npm run dev` na 5173.
 *  - Já tem servidor no ar? `E2E_BASE_URL=http://localhost:4173` (não sobe nada).
 *
 * Isolamento de execução (útil em máquina compartilhada/CI paralelo): E2E_PORT (porta do preview),
 * E2E_DIST (pasta do build demo), E2E_OUTPUT_DIR (resultados) e E2E_REPORT_DIR (relatório HTML).
 *
 * Projetos: desktop (1440×900) e mobile (390×844) rodam tudo; tablet (768×1024) só responsividade.
 * Isolamento: cada teste usa um contexto de navegador NOVO (localStorage vazio → seed do mock).
 * Baselines visuais dependem do SO: gere-as em Linux (CI). Ver docs/TESTING.md.
 */
const useDev = process.env.E2E_DEV === "1";
const port = Number(process.env.E2E_PORT ?? (useDev ? 5173 : 4173));
const dist = process.env.E2E_DIST ?? "dist";
const vite = "node node_modules/vite/bin/vite.js";
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["specs/**/*.spec.ts", "visual/**/*.spec.ts"],
  outputDir: process.env.E2E_OUTPUT_DIR ?? "./test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4, // mais que isso satura o preview único e gera falsos negativos de tempo
  timeout: 45_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled", caret: "hide" },
  },
  reporter: [["list"], ["html", { outputFolder: process.env.E2E_REPORT_DIR ?? "reports/playwright", open: "never" }]],
  use: {
    baseURL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    colorScheme: "dark",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    serviceWorkers: "allow", // o MSW roda em service worker
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
      testIgnore: ["**/responsive.spec.ts"],
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
      testIgnore: ["**/responsive.spec.ts"],
    },
    {
      name: "chromium-tablet",
      use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 }, hasTouch: true },
      testMatch: ["**/responsive.spec.ts"],
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: useDev
          ? "npm run dev"
          : `${vite} build --mode demo --outDir ${dist} --emptyOutDir && ${vite} preview --outDir ${dist} --port ${port} --strictPort`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        stdout: "ignore",
        stderr: "pipe",
      },
});
