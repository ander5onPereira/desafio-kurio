import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import { env } from "./env";

/**
 * Boot: se os mocks estiverem ativos (VITE_ENABLE_MOCKS), o MSW sobe ANTES de qualquer requisição
 * e antes de o App ser carregado. A ordem é serial de propósito: baixar o App em paralelo com os
 * mocks dividiu a banda e piorou FCP/LCP no Lighthouse mobile (ver docs/PERFORMANCE.md).
 * Este é o único ponto da aplicação autorizado a importar `src/mocks` (e só via import dinâmico,
 * para o código dos mocks ficar em chunk separado).
 */
async function bootstrap() {
  if (env.VITE_ENABLE_MOCKS) {
    const { enableMocks } = await import("./mocks/enable");
    await enableMocks();
  }

  const { App } = await import("./App");
  const container = document.getElementById("root");
  if (!container) throw new Error("Elemento #root não encontrado");
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
