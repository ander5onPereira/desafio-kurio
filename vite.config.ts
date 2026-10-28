import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [
    // O plugin do Router precisa vir antes do plugin do React.
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: [
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
      // O cookie store do MSW (`tough-cookie` + `tldts`, ~300 KB) não é usado: a sessão vai por token.
      { find: /^tough-cookie$/, replacement: fileURLToPath(new URL("./src/mocks/shims/toughCookie.ts", import.meta.url)) },
    ],
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: { sourcemap: true, target: "es2022" },
});
