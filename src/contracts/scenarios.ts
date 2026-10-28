/**
 * Cenários determinísticos do mock. Definição (ids) compartilhada entre os mocks, o ScenarioPanel,
 * os testes Playwright e a documentação. O comportamento de cada um vive em src/mocks/scenarios.
 */
export const SCENARIO_IDS = [
  "default",
  /** Idem default, mas com o carrinho do usuário Ana pré-carregado igual ao Figma (26.83 / 0.016 / 26.846). Base da regressão visual. */
  "figma",
  "empty",
  "slow",
  "variable-latency",
  /** Busca: a 1ª requisição responde depois da 2ª (resposta antiga chega por último). */
  "out-of-order",
  "offline",
  "server-errors",
  /** 4xx variados por rota (400/403/404/409/422/429). */
  "client-errors",
  /** Token expira e o refresh falha. */
  "session-expired",
  "unauthorized",
  "register-conflict",
  "coupon-invalid",
  "coupon-expired",
  /** Preço muda entre a revisão e o envio do pedido (QUOTE_CHANGED). */
  "price-changed-on-checkout",
  /** Edição esgota durante a compra (AVAILABILITY_CONFLICT). */
  "sold-out-on-checkout",
  /** Pedido É criado, mas a resposta nunca chega (timeout) → recuperação por idempotência. */
  "order-timeout",
  "payment-confirmed",
  "payment-declined",
  /** Conexão com a carteira é recusada pelo usuário (WALLET_REJECTED). */
  "wallet-rejected",
  /** Derruba o websocket enquanto o pedido está pendente. */
  "socket-drop",
] as const;
export type ScenarioId = (typeof SCENARIO_IDS)[number];

export const TEST_USERS = {
  ana: { email: "ana@kurio.test", password: "Kurio@2026", username: "ana.nova" },
  bruno: { email: "bruno@kurio.test", password: "Kurio@2026", username: "bruno.vega" },
} as const;

export const TEST_COUPONS = {
  valid: "KURIO10",
  expired: "EXPIRADO20",
  invalid: "INVALIDO",
  freeFee: "TAXA0",
} as const;

export const TEST_REFERRAL_CODE = "KURIO-2026";
