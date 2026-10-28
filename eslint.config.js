import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import pluginQuery from "@tanstack/eslint-plugin-query";
import pluginRouter from "@tanstack/eslint-plugin-router";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "node_modules",
      "reports",
      "playwright-report",
      "test-results",
      "public/mockServiceWorker.js",
      "src/routeTree.gen.ts",
      "Desktop",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginQuery.configs["flat/recommended"],
  ...pluginRouter.configs["flat/recommended"],
  jsxA11y.flatConfigs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
    },
  },
  {
    // Fronteira dos mocks: nenhum código da aplicação pode importar src/mocks.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/mocks/**", "src/main.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/mocks", "@/mocks/*", "**/mocks", "**/mocks/*"],
              message:
                "Mocks vivem só em src/mocks e são carregados apenas por src/main.tsx. Componentes, hooks e Axios não podem importá-los.",
            },
          ],
        },
      ],
    },
  },
  {
    // Mocks podem usar console.info para logs de cenário.
    files: ["src/mocks/**/*.{ts,tsx}", "scripts/**/*.ts", "e2e/**/*.ts"],
    rules: { "no-console": "off" },
  },
);
