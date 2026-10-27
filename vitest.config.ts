import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

// Vitest só cobre lógica pura (money, guards de evento, schemas). UI e fluxos = Playwright.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
