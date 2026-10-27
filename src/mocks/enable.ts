import { createControl } from "./control";
import { initServer } from "./init";
import { worker } from "./browser";

/**
 * Sobe o servidor simulado. Chamado SOMENTE por src/main.tsx (import dinâmico) quando
 * VITE_ENABLE_MOCKS=true, ANTES de qualquer requisição e antes de o app carregar o socket.io-client
 * (o engine.io captura `WebSocket` no carregamento do módulo — ver docs/progress/A.md).
 */
export async function enableMocks(): Promise<void> {
  await initServer();
  await worker.start({
    // Assets estáticos (imagens, fontes, chunks) passam direto; só /api/** é simulado.
    onUnhandledRequest: "bypass",
    serviceWorker: { url: "/mockServiceWorker.js" },
    quiet: true,
  });

  const control = createControl();
  window.__kurio = control;

  // O painel é opcional: carregado depois, sem atrasar o boot do app.
  void import("./ScenarioPanel").then(({ mountScenarioPanel }) => mountScenarioPanel(control));
}
