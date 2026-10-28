import type { ScenarioId } from "@/contracts";

/**
 * Definição declarativa de cada cenário (ids vêm de src/contracts/scenarios.ts).
 * O comportamento é aplicado por `scenarios/pre.ts` (antes do handler) e pelos serviços
 * (que consultam as `flags`).
 */
export type LatencyPolicy =
  | { kind: "none" }
  | { kind: "fixed"; ms: number }
  | { kind: "seeded"; min: number; max: number };

export interface ScenarioFlags {
  emptyCatalog?: boolean;
  offline?: boolean;
  /** Falhas 503/500 nas N primeiras chamadas de cada rota (GET) e M das demais (exceto /auth). */
  serverErrors?: { reads: number; writes: number };
  /** Tabela fixa de 4xx por rota (exceto /auth). */
  clientErrors?: boolean;
  /** Recursos privados: 401 (leitura) / 403 (escrita). */
  unauthorized?: boolean;
  accessTtlMs?: number;
  refreshAlwaysFails?: boolean;
  registerConflict?: boolean;
  couponMode?: "invalid" | "expired";
  /** Resultado decidido na criação do pedido. */
  orderOutcome?: "confirmed" | "declined";
  /** Na 1ª criação de pedido o preço do 1º item sobe → 409 QUOTE_CHANGED. */
  priceChangeOnCheckout?: boolean;
  /** Na 1ª criação de pedido o estoque do 1º item zera → 409 AVAILABILITY_CONFLICT. */
  soldOutOnCheckout?: boolean;
  /** A 1ª criação de pedido é aplicada, mas a resposta nunca chega. */
  orderTimeoutOnce?: boolean;
  walletRejected?: boolean;
  /** Ao criar um pedido o websocket cai; o pedido resolve com o cliente desconectado. */
  socketDropOnOrder?: boolean;
  /** GET /nfts: requisições ímpares lentas e pares rápidas (respostas fora de ordem). */
  outOfOrder?: boolean;
}

export interface ScenarioDef {
  id: ScenarioId;
  label: string;
  description: string;
  latency: LatencyPolicy;
  flags: ScenarioFlags;
  /** Onde e como ver o efeito na tela (mostrado no painel do mock). `path` é a tela de partida. */
  tryIt: { path: string; steps: string };
}

const LOGIN = "Entre como ana@kurio.test (senha Kurio@2026)";
const CHECKOUT = `${LOGIN}, compre um NFT, vá ao pagamento, conecte a carteira e confirme o pedido`;

const DEFAULT_LATENCY: LatencyPolicy = { kind: "seeded", min: 80, max: 200 };

export const SCENARIOS: Record<ScenarioId, ScenarioDef> = {
  default: {
    id: "default",
    label: "Padrão",
    description: "Sucesso em tudo, latência baixa e estável (80–200 ms).",
    tryIt: { path: "/", steps: "Navegue normalmente: tudo responde com sucesso e com latência baixa." },
    latency: DEFAULT_LATENCY,
    flags: {},
  },
  figma: {
    id: "figma",
    label: "Figma (visual)",
    description: "Como o padrão, com o carrinho da Ana igual ao frame do Figma (26.83 / 0.016 / 26.846). Base da regressão visual.",
    tryIt: { path: "/login?redirect=%2Fcarrinho", steps: `${LOGIN}: o carrinho já vem com Emerald ×2, Violet ×6 e Ivory ×9, total de 26.846 ETH.` },
    latency: { kind: "fixed", ms: 60 },
    flags: {},
  },
  empty: {
    id: "empty",
    label: "Resultado vazio",
    description: "O catálogo não devolve nenhum NFT.",
    tryIt: { path: "/", steps: "A página inicial mostra 'Nenhum NFT encontrado' (catálogo vazio)." },
    latency: DEFAULT_LATENCY,
    flags: { emptyCatalog: true },
  },
  slow: {
    id: "slow",
    label: "Lento",
    description: "Latência fixa de 2,5 s em toda requisição (para ver skeletons).",
    tryIt: { path: "/", steps: "Cada chamada demora 2,5 s: recarregue a página inicial, abra um NFT ou filtre o catálogo para ver os skeletons." },
    latency: { kind: "fixed", ms: 2_500 },
    flags: {},
  },
  "variable-latency": {
    id: "variable-latency",
    label: "Latência variável",
    description: "Latência de 150 ms a 2,5 s, em sequência reproduzível (semente fixa).",
    tryIt: { path: "/", steps: "Filtre e pagine o catálogo: cada resposta demora um tempo diferente (150 ms a 2,5 s), sempre na mesma sequência." },
    latency: { kind: "seeded", min: 150, max: 2_500 },
    flags: {},
  },
  "out-of-order": {
    id: "out-of-order",
    label: "Respostas fora de ordem",
    description: "GET /nfts: a 1ª, 3ª, 5ª… requisição demora 1,8 s e a 2ª, 4ª… responde em 80 ms (a resposta antiga chega por último).",
    tryIt: { path: "/", steps: "Na busca da página inicial, digite duas buscas seguidas (ex.: Golden e depois Emerald): a resposta antiga chega por último e a tela mantém a mais recente." },
    latency: DEFAULT_LATENCY,
    flags: { outOfOrder: true },
  },
  offline: {
    id: "offline",
    label: "Sem conexão",
    description: "Toda requisição de API falha por conexão (sem resposta).",
    tryIt: { path: "/", steps: "A página inicial mostra 'Sem conexão com o servidor' e 'Tentar novamente'. Para recuperar, aplique Padrão em 'Só comportamento' e tente de novo." },
    latency: { kind: "none" },
    flags: { offline: true },
  },
  "server-errors": {
    id: "server-errors",
    label: "Erros 5xx",
    description: "Cada rota de leitura falha 3× (503/500) e depois funciona; escritas falham 1×. Rotas /auth não são afetadas.",
    tryIt: { path: "/", steps: "O catálogo falha 3 vezes (503/500) e mostra o erro com 'Tentar novamente'; na tentativa seguinte carrega. Escritas (carrinho, favoritos) falham 1 vez." },
    latency: DEFAULT_LATENCY,
    flags: { serverErrors: { reads: 3, writes: 1 } },
  },
  "client-errors": {
    id: "client-errors",
    label: "Erros 4xx",
    description: "GET /nfts → 400 · GET /nfts/:id → 403 · POST /cart/items → 422 · PUT /favorites/:id → 403 · POST /quotes → 429 · POST /orders → 409.",
    tryIt: { path: "/", steps: "A página inicial mostra o erro 400 do catálogo. Abrir /nft/emerald-ape-042 dá 403 e adicionar ao carrinho dá 422." },
    latency: DEFAULT_LATENCY,
    flags: { clientErrors: true },
  },
  "session-expired": {
    id: "session-expired",
    label: "Sessão expirada",
    description: "Access token vale 60 s e o refresh sempre falha (SESSION_EXPIRED). Use o relógio do mock para avançar o tempo.",
    tryIt: { path: "/login?redirect=%2Fperfil", steps: `${LOGIN}. O token vale 60 s e o refresh falha: navegue depois disso (ou avance o relógio em 'Relógio do servidor') e o app volta ao login preservando a rota.` },
    latency: DEFAULT_LATENCY,
    flags: { accessTtlMs: 60_000, refreshAlwaysFails: true },
  },
  unauthorized: {
    id: "unauthorized",
    label: "Não autorizado",
    description: "Recursos privados respondem 401 (leitura) ou 403 (escrita), mesmo com login.",
    tryIt: { path: "/login?redirect=%2Fperfil", steps: `${LOGIN}: perfil, favoritos, carteiras e pedidos respondem 401/403 mesmo com login.` },
    latency: DEFAULT_LATENCY,
    flags: { unauthorized: true },
  },
  "register-conflict": {
    id: "register-conflict",
    label: "Conflito de cadastro",
    description: "POST /auth/register sempre responde 409 EMAIL_TAKEN (erro no campo e-mail).",
    tryIt: { path: "/cadastro", steps: "Preencha o cadastro com qualquer e-mail: o servidor responde 409 e o erro aparece no campo E-mail." },
    latency: DEFAULT_LATENCY,
    flags: { registerConflict: true },
  },
  "coupon-invalid": {
    id: "coupon-invalid",
    label: "Cupom inválido",
    description: "Qualquer cupom informado é recusado como inexistente (422 COUPON_INVALID).",
    tryIt: { path: "/", steps: "Adicione um NFT ao carrinho, abra o carrinho e aplique qualquer cupom (ex.: KURIO10): ele é recusado como inexistente, com o erro no campo." },
    latency: DEFAULT_LATENCY,
    flags: { couponMode: "invalid" },
  },
  "coupon-expired": {
    id: "coupon-expired",
    label: "Cupom expirado",
    description: "Qualquer cupom informado é recusado como expirado (422 COUPON_EXPIRED).",
    tryIt: { path: "/", steps: "Adicione um NFT ao carrinho, abra o carrinho e aplique qualquer cupom (ex.: KURIO10): ele é recusado como expirado, com o erro no campo." },
    latency: DEFAULT_LATENCY,
    flags: { couponMode: "expired" },
  },
  "price-changed-on-checkout": {
    id: "price-changed-on-checkout",
    label: "Preço muda no checkout",
    description: "No 1º envio de pedido o preço do 1º item sobe (+0.10 ETH): 409 QUOTE_CHANGED com a cotação nova. Uma vez por reset.",
    tryIt: { path: "/login", steps: `${CHECKOUT}: o preço do 1º item sobe (+0.10 ETH) e aparece 'Aceitar novos valores' (uma vez por reset).` },
    latency: DEFAULT_LATENCY,
    flags: { priceChangeOnCheckout: true },
  },
  "sold-out-on-checkout": {
    id: "sold-out-on-checkout",
    label: "Esgota no checkout",
    description: "No 1º envio de pedido o estoque do 1º item zera: 409 AVAILABILITY_CONFLICT. Uma vez por reset.",
    tryIt: { path: "/login", steps: `${CHECKOUT}: aparece o aviso de que a edição não está mais disponível e o carrinho é preservado (uma vez por reset).` },
    latency: DEFAULT_LATENCY,
    flags: { soldOutOnCheckout: true },
  },
  "order-timeout": {
    id: "order-timeout",
    label: "Timeout após criar pedido",
    description: "O 1º POST /orders cria o pedido, mas a resposta nunca chega. Reenviar com a MESMA Idempotency-Key recupera o mesmo pedido.",
    tryIt: { path: "/login", steps: `${CHECKOUT}: a resposta nunca chega, o app avisa que não cria uma nova compra e 'Tentar novamente' recupera o mesmo pedido.` },
    latency: DEFAULT_LATENCY,
    flags: { orderTimeoutOnce: true },
  },
  "payment-confirmed": {
    id: "payment-confirmed",
    label: "Pagamento confirmado",
    description: "O pedido fica pendente ~1,5 s e termina confirmado (order.updated).",
    tryIt: { path: "/login", steps: `${CHECKOUT}: o pedido fica pendente ~1,5 s e termina confirmado, com o recibo.` },
    latency: DEFAULT_LATENCY,
    flags: { orderOutcome: "confirmed" },
  },
  "payment-declined": {
    id: "payment-declined",
    label: "Pagamento recusado",
    description: "O pedido fica pendente ~1,5 s e termina recusado (order.updated).",
    tryIt: { path: "/login", steps: `${CHECKOUT}: o pedido fica pendente ~1,5 s e termina em 'Pagamento recusado'; o carrinho é preservado.` },
    latency: DEFAULT_LATENCY,
    flags: { orderOutcome: "declined" },
  },
  "wallet-rejected": {
    id: "wallet-rejected",
    label: "Carteira recusa conexão",
    description: "POST /wallets/connect responde 422 WALLET_REJECTED.",
    tryIt: { path: "/login", steps: `${LOGIN}, compre um NFT, vá ao pagamento e conecte a carteira: a conexão é recusada, com 'Tentar novamente'.` },
    latency: DEFAULT_LATENCY,
    flags: { walletRejected: true },
  },
  "socket-drop": {
    id: "socket-drop",
    label: "Websocket cai com pedido pendente",
    description: "Ao criar um pedido o websocket cai por ~3,5 s; o pedido resolve nesse intervalo (o evento se perde) e o cliente precisa reconciliar por REST.",
    tryIt: { path: "/login", steps: `${CHECKOUT}: o websocket cai por ~3,5 s e o pedido resolve nesse intervalo; o app reconcilia por REST e mostra o resultado.` },
    latency: DEFAULT_LATENCY,
    flags: { socketDropOnOrder: true },
  },
};
