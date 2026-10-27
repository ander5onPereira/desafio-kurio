# Kurio — marketplace de NFTs

Solução do desafio frontend ([enunciado](docs/DESAFIO.md)): descoberta, compra e conta do colecionador, em desktop e mobile, com **API simulada (MSW)**, **tempo real (Socket.IO)**, testes **Playwright** e auditoria **Lighthouse**.

- **Aplicação publicada:** https://kurio.arpdev.online (build `demo`: otimizado, mocks ligados; deploy por GitHub Actions na VPS — ver [Deploy](#deploy))
- **Decisões, limitações e desvios do Figma:** [ARCHITECTURE.md](ARCHITECTURE.md)

## Stack

React 19 · TypeScript · Vite 8 · Tailwind v4 · TanStack Router (file-based) + Query · Axios · Socket.IO client · MSW 2 (+ `@mswjs/socket.io-binding`) · Zod 4 · React Hook Form · Radix UI / shadcn (componentes `App*`) · Motion · Sonner · Vitest · Playwright · Lighthouse.

## Começando

Pré-requisitos: Node 22+ e npm.

```bash
npm ci                 # instala (usa o lockfile)
npx playwright install chromium   # só para E2E e Lighthouse
npm run dev            # http://localhost:5173 — com os mocks ligados
```

Não há backend: o "servidor" é o MSW rodando no navegador (REST) e uma conexão WebSocket simulada para o Socket.IO. Nada depende de serviço externo.

### Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Desenvolvimento com mocks |
| `npm run build` / `npm run build:demo` | Build de produção (tipos + Vite) / build **demo** (mocks ligados, o que é publicado) |
| `npm run preview` | Serve o build em http://localhost:4173 |
| `npm run typecheck` · `npm run lint` | Tipos · ESLint |
| `npm run test` | Vitest (lógica pura e handlers do mock) |
| `npm run check` | tipos + lint + testes + contraste dos tokens + fronteira dos mocks |
| `npm run e2e` | Playwright contra o build demo (12 grupos do enunciado + regressão visual) |
| `npm run lh` | Lighthouse: Início e Detalhe × mobile e desktop, mediana de 3 → `reports/lighthouse/` |

`make help` lista os mesmos atalhos. Detalhes de testes em [docs/TESTING.md](docs/TESTING.md) e de performance em [docs/PERFORMANCE.md](docs/PERFORMANCE.md).

### Variáveis de ambiente

| Variável | Padrão | Uso |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` | Liga o MSW. Com `false` o front fala com a API real em `VITE_API_URL` |
| `VITE_MOCK_SCENARIO` | `default` | Cenário inicial dos mocks |
| `VITE_API_URL` | `/api` | Base da API REST |

Arquivos: `.env.development`, `.env.demo` (usado por `build:demo`) e `.env.example` (copie para `.env.local` para sobrescrever).

## Credenciais fictícias

| Item | Valor |
| --- | --- |
| Usuários | `ana@kurio.test` · `bruno@kurio.test` — senha `Kurio@2026` |
| Cupons | `KURIO10` (10%) · `EXPIRADO20` (expirado) · `INVALIDO` (inexistente) · `TAXA0` (taxa de rede grátis) |
| Código de indicação | `KURIO-2026` |

Também é possível criar uma conta nova em `/cadastro`.

## Cenários dos mocks

Escolha pela URL (`/?scenario=slow`; acrescente `&reset=1` para restaurar o banco) ou pelo botão **“Mock · &lt;cenário&gt;”** no canto inferior esquerdo, que abre o painel de cenários, injeção de falhas, alteração de NFT e relógio. O estado do “servidor” fica no `localStorage` (`kurio.mockdb.v1`) e sobrevive ao refresh.

Cenários: `default` · `figma` (carrinho da Ana com os valores do layout) · `empty` · `slow` · `variable-latency` · `out-of-order` · `offline` · `server-errors` · `client-errors` · `session-expired` · `unauthorized` · `register-conflict` · `coupon-invalid` · `coupon-expired` · `price-changed-on-checkout` · `sold-out-on-checkout` · `order-timeout` · `payment-confirmed` · `payment-declined` · `wallet-rejected` · `socket-drop`.

**Reset:** `?scenario=default&reset=1`, o painel, ou `await __kurio.reset()` no console.

### Reproduzir fluxos de falha

| Quero ver… | Faça |
| --- | --- |
| Skeletons de carregamento lento | `/?scenario=slow` |
| Erro de conexão e recuperação | `/?scenario=offline`; depois `__kurio.scenario.set("default", { keepData: true })` e **Tentar novamente** |
| Erros 5xx com retry | `/?scenario=server-errors` (o cache tenta 3×; o botão **Tentar novamente** recupera) |
| Respostas fora de ordem | `/?scenario=out-of-order` e digite duas buscas seguidas |
| Cupom inválido / expirado | `INVALIDO` / `EXPIRADO20` no carrinho |
| Preço mudou durante a compra | `?scenario=price-changed-on-checkout` e confirme o pedido |
| Edição esgotada na compra | `?scenario=sold-out-on-checkout` |
| Pedido sem resposta (timeout) | `?scenario=order-timeout` → **Tentar novamente** recupera o **mesmo** pedido (mesma `Idempotency-Key`) |
| Pagamento recusado | `?scenario=payment-declined` |
| Sessão expirada | `__kurio.scenario.set("session-expired", { keepData: true })` + `__kurio.clock.set("<data futura>")` e navegue |
| Queda do websocket com pedido pendente | `?scenario=socket-drop` |
| Preço/estoque em tempo real | Painel → NFT, ou `__kurio.nft.update("emerald-ape-042", { price: "1.49", editionId: "ed-1-50" })` com o NFT aberto, no carrinho ou no pagamento |

O plano de controle (`window.__kurio`) atua no **servidor simulado**; o app recebe tudo pelo Axios e pelo `socket.io-client` reais. Referência completa em [docs/MOCKS.md](docs/MOCKS.md).

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Arquitetura, decisões (ADRs), sessão, carrinho, desvios do Figma e limitações |
| [docs/CONTRACTS.md](docs/CONTRACTS.md) | Contratos REST e eventos (gerado a partir de `src/contracts`) |
| [docs/CACHE.md](docs/CACHE.md) | Cache, retry, otimismo e reconciliação REST ↔ Socket.IO |
| [docs/MOCKS.md](docs/MOCKS.md) | Servidor simulado, cenários, control plane |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Tokens e componentes `App*` (também em `/design-system`) |
| [docs/TESTING.md](docs/TESTING.md) · [docs/PERFORMANCE.md](docs/PERFORMANCE.md) | Estratégia de testes · resultados e análise do Lighthouse |
| [docs/DESAFIO.md](docs/DESAFIO.md) | Enunciado original |

## Estrutura

```
src/
  contracts/   contratos Zod compartilhados entre app e mocks (fonte da verdade da API)
  mocks/       servidor simulado (MSW + Socket.IO), cenários e painel — só main.tsx o importa
  modules/     domínios (auth, nfts, favorites, cart, quote, orders, checkout, realtime, profile, wallets)
  components/  ui (App*), shared, layout
  lib/         api (Axios + sessão), money (decimal.js), queryKeys, queryClient, errors
  routes/      TanStack Router (file-based)
e2e/           specs Playwright, fixtures e regressão visual
scripts/       imagens, contraste, fronteira dos mocks, Lighthouse
```

## Deploy

Publicado numa VPS atrás do Traefik (HTTPS automático): `Dockerfile` (Node → nginx), `nginx.conf` (fallback de SPA, cache imutável em `/assets`, `index.html` e service worker sem cache, cabeçalhos de segurança) e `docker-compose.yml` (rede `traefik`, healthcheck em `/healthz`).

- **Automático:** PR para `main` roda o CI (`.github/workflows/ci.yml`: `npm run check` + `build:demo`); o merge dispara `deploy.yml` (revalida, `rsync` e `docker compose up -d --build` via SSH). Secret necessário: `SSH_PRIVATE_KEY`.
- **E2E em PR:** `e2e.yml` (Playwright). `visual-baselines.yml` gera as baselines visuais em Linux (manual).
- **Manual:** `make deploy` (rsync + compose), `make logs`, `make ps`.
- **Localmente com Docker:** `docker build -t kurio . && docker run --rm -p 8080:80 kurio` → http://localhost:8080
