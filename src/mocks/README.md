# Servidor simulado (MSW 2 + Socket.IO)

Todo dado fictício e toda regra de "servidor" vivem **somente aqui**. O app (componentes, hooks, Axios)
não sabe que existe mock: só `src/main.tsx` importa `./mocks/enable` (import dinâmico) quando
`VITE_ENABLE_MOCKS=true`. `npm run check-mocks` e uma regra do ESLint garantem a fronteira.

```
src/mocks/
├─ enable.ts            # boot: initServer → worker.start → window.__kurio → ScenarioPanel
├─ init.ts              # cenário inicial (?scenario=, estado persistido, env), reagenda pedidos pendentes
├─ control.ts           # window.__kurio (implementa KurioControl de src/contracts/control.ts)
├─ ScenarioPanel.tsx    # painel flutuante (raiz React própria; só Tailwind + tokens)
├─ config.ts            # TTLs, taxas de rede, códigos de indicação, chave do localStorage
├─ db/                  # types · store (memória + persistência + ids/tokens) · seed (reset)
├─ fixtures/            # catalog (96 NFTs) · content (hero, avaliações) · users · coupons
├─ services/            # regras de domínio puras sobre o db (auth, cart, quote, orders, wallets…)
├─ handlers/            # um arquivo por domínio; route.ts liga endpoint do contrato ↔ MSW
├─ scenarios/           # definitions (21 cenários) · runtime (contadores, injeções) · pre (falhas/latência)
├─ realtime/            # handler (ws.link) · broadcaster (clientes por usuário) · hub (log) · events
└─ lib/                 # prng (mulberry32) · clock · hash · password (PBKDF2) · decimal
```

## Princípios

- **Contrato único.** Cada rota é `route(base, endpoints.x.y, resolver)`: o path, o body, a query e a
  **resposta** são os schemas Zod de `src/contracts`. Uma resposta fora do contrato vira `500 INTERNAL`
  (e `console.error`), então o mock não consegue divergir do app.
- **REST e Socket.IO coerentes.** Toda mudança de NFT passa por `services/nftAdmin.updateNft` (sobe a
  `version` e publica `nft.updated`); toda liquidação de pedido publica `order.updated`.
- **Determinismo.** Sem `Math.random`: PRNG com semente fixa (ids, tokens, uuids de eventos, latência
  variável) e relógio injetável (`clock`). Mesmo cenário → mesma sequência.
- **Persistência e reset.** O banco inteiro vai para `localStorage` (`kurio.mockdb.v1`, debounce 120 ms);
  refresh preserva sessão/carrinho/pedidos. `reset` reconstrói tudo a partir do seed do cenário.
- **Senhas** só existem como PBKDF2-SHA256 (10 mil iterações) + sal; tokens são opacos.

## Dados de teste

| O quê | Valor |
| --- | --- |
| Usuários | `ana@kurio.test` (`ana.nova`) · `bruno@kurio.test` (`bruno.vega`) — senha `Kurio@2026` |
| Cupons | `KURIO10` (10% do subtotal) · `EXPIRADO20` (expirado) · `INVALIDO` (inexistente) · `TAXA0` (taxa de rede grátis) |
| Código de indicação | `KURIO-2026` (também `KURIO-VIP`) |
| Carteiras da Ana | Principal `0xA91F…E82C` (Ethereum, MetaMask) · Reserva `nova.kurio.eth` (Polygon, WalletConnect) |
| Carteira do Bruno | Principal `0x5B3c…8A0c` (Ethereum, Coinbase) |
| Taxa de rede | ethereum `0.016` · polygon `0.002` · solana `0.0005` (sempre `feeEstimated: true`) |
| Catálogo | 96 NFTs, 9 coleções, 3 redes, edições `ed-1-1` `ed-1-10` `ed-1-50` `ed-open`; ~8% esgotados |

A 1ª página (`sort=recent`, 9 itens) reproduz o Figma: Emerald Ape #042 · Sage Nomad #009 · Neon Vessel #552
(1.99, antes 2.29, RARO) · Cosmic Bloom #118 · Violet Nomad #314 · Ivory Baron #088 · Golden Beat #207 ·
Golden Frequency #071 · Golden Signal #160. As contagens das facetas são calculadas dos dados reais.

## Cenários

Seleção: `?scenario=<id>` na URL (`&reset=1` força reset), `VITE_MOCK_SCENARIO`, painel "Mock · …" ou
`await __kurio.scenario.set("<id>")`. Trocar de cenário **restaura o banco** (use `{ keepData: true }` para
só trocar o comportamento). Contadores "uma vez por reset" persistem em refresh.

| Id | Comportamento |
| --- | --- |
| `default` | Sucesso; latência 80–200 ms (semeada) |
| `figma` | Como o padrão + carrinho da Ana = Emerald ×2, Violet ×6, Ivory ×9 → **26.83 / 0.016 / 26.846** (base da regressão visual; latência fixa de 60 ms) |
| `empty` | `GET /nfts` sem resultados |
| `slow` | 2,5 s em toda requisição (skeletons) |
| `variable-latency` | 150 ms–2,5 s, sequência reproduzível |
| `out-of-order` | `GET /nfts`: requisições ímpares 1,8 s, pares 80 ms → a resposta antiga chega por último |
| `offline` | Falha de conexão em toda requisição de API |
| `server-errors` | Cada rota de leitura falha 3× (503/500/503) e depois funciona; escritas falham 1×; `/auth` isento |
| `client-errors` | `GET /nfts` 400 · `GET /nfts/:id` 403 · `POST /cart/items` 422 · `PUT /favorites/:id` 403 · `POST /quotes` 429 · `POST /orders` 409 |
| `session-expired` | Access de 60 s e `refresh` sempre 401 `SESSION_EXPIRED` (avance o `clock`) |
| `unauthorized` | Recursos privados: 401 (leitura) / 403 (escrita) |
| `register-conflict` | `POST /auth/register` → 409 `EMAIL_TAKEN` (erro no campo `email`) |
| `coupon-invalid` / `coupon-expired` | Qualquer cupom → 422 `COUPON_INVALID` / `COUPON_EXPIRED` |
| `price-changed-on-checkout` | No 1º `POST /orders` o preço do 1º item sobe 0.10 → 409 `QUOTE_CHANGED` com `meta.quote` (uma vez) |
| `sold-out-on-checkout` | No 1º `POST /orders` o estoque do 1º item zera → 409 `AVAILABILITY_CONFLICT` (uma vez) |
| `order-timeout` | O 1º `POST /orders` **cria o pedido** mas a resposta nunca chega; reenviar com a mesma `Idempotency-Key` devolve o mesmo pedido (200 + `Idempotent-Replayed: true`) |
| `payment-confirmed` / `payment-declined` | Pedido pendente ~1,5 s → `confirmed` / `declined` (`order.updated`) |
| `wallet-rejected` | `POST /wallets/connect` → 422 `WALLET_REJECTED` |
| `socket-drop` | Ao criar pedido o websocket cai ~3,5 s; o pedido resolve nesse intervalo (evento perdido) → o cliente reconcilia por REST |

Falha pontual sem trocar de cenário: `__kurio.inject({ method: "get", path: "/nfts*", behavior: { type: "status", status: 503 }, times: 2 })`
(comportamentos: `delay`, `status`, `network-error`, `timeout` — este com `afterMutation: true` aplica a operação e engole a resposta).

## Control plane — `window.__kurio` (só com mocks ligados)

```ts
__kurio.scenario.set(id, { keepData? }) · .current() · .list()
__kurio.reset(id?)                                  // restaura o banco; recarregue a página para limpar o cache do app
__kurio.inject(rule) · .clearInjections()
__kurio.nft.update(id, { price?, available?, editionId? })   // muda o db → REST e nft.updated refletem
__kurio.order.settle(orderId, "confirmed" | "declined")
__kurio.socket.drop() · .restore() · .replay(eventId) · .emitStale(nftId) · .emitted()
__kurio.clock.set(iso) · .reset()
```

Isto atua no **servidor simulado**: o app recebe tudo pelo Axios e pelo `socket.io-client` reais — nunca por
setters/callbacks. No Playwright use `page.evaluate` (o `APIRequestContext` roda fora do navegador e **não**
passa pelo MSW).

## Regras de negócio simuladas

- **Sessão:** access 15 min, refresh 7 dias com rotação (reutilizar refresh antigo → `SESSION_EXPIRED`);
  logout apaga a sessão e fecha os sockets daquele token.
- **Carrinho:** visitante por `X-Cart-Id`, usuário por token; limite = `min(estoque, maxPerOrder)`; `POST /cart/merge`
  soma e ajusta (`LIMITED`/`UNAVAILABLE`). O estado da linha (`price-changed`, `limited`, `unavailable`) é derivado
  do preço/estoque atuais; alterar a quantidade conta como "ciente do novo preço".
- **Cotação:** calculada do carrinho (+cupom +rede); `revision` = hash do conteúdo (linhas, estoque, cupom, rede,
  taxa). TTL de 5 min.
- **Pedido:** `Idempotency-Key` obrigatória; mesma chave+corpo → mesmo pedido; corpo diferente → 409. Revalida
  estoque (`AVAILABILITY_CONFLICT`) e revisão (`QUOTE_CHANGED`). `202 pending` → ~1,5 s → `confirmed|declined`
  (versão 2). O **estoque baixa e o carrinho perde só o comprado na confirmação**. O recibo é um snapshot imutável.
  Pendentes sobrevivem a refresh: são reagendados no boot e liquidados "preguiçosamente" ao ler com o relógio já vencido.
- **Erros de campo** usam o nome do campo do body; aninhados com ponto (`collector.referralCode`).

## Transporte Socket.IO e limitações (Spike A)

- Cliente: `io(origin, { ...SOCKET_CLIENT_OPTIONS, auth: cb => cb({ token }) })` — só `websocket`.
  **Carregue o `socket.io-client` DEPOIS de `worker.start()`** (import dinâmico): o `engine.io-client` captura
  `globalThis.WebSocket` na avaliação do módulo; importado antes, a conexão escapa do mock.
- `@mswjs/socket.io-binding` **0.2.0** expõe `toSocketIo(connection)` (o README do GitHub fala numa classe `SocketIo`
  que não existe nesta versão): só namespace padrão, só eventos de texto, **sem acks, sem binário, sem rooms/broadcast**.
  O `sid` do handshake é sempre `"test"`. O mock envia ping `2` a cada 20 s (o cliente responde `3`; sem ping o
  cliente derruba a conexão em ~30 s).
- O MSW remove o prefixo `/socket.io/` do caminho antes de casar o `ws.link`; por isso o link é `*` e o handler
  filtra por caminho e repassa (`server.connect()`) o resto (ex.: HMR do Vite).
- Identificação do usuário: pacote CONNECT `auth.token` (lido a cada reconexão) ou `?token=` na URL. Sem token =
  visitante (só eventos públicos). Eventos privados levam `userScope` e só vão aos sockets daquele usuário.
- `drop()` fecha as conexões e **recusa novas** (o cliente vê `connect_error` e tenta de novo com backoff);
  `restore()` deixa reconectar. Eventos perdidos **não** são reenviados: o cliente reconcilia por REST.

## Limitações conhecidas

- O "servidor" roda dentro da página: **sem sincronização entre abas/dispositivos** (cada aba tem seu próprio
  banco carregado do `localStorage` no boot). `reset` resolve.
- MSW não emite cookies `HttpOnly`: a sessão é um token opaco guardado pelo cliente (em produção o refresh iria em
  cookie `HttpOnly`).
- O worker e o código dos mocks (~150 KB gzip, chunk separado) entram no caminho crítico do boot do build `demo`
  (precisam subir antes da 1ª requisição) — impacto a medir no Lighthouse.
- `delay()` e timers usam o relógio real do navegador; use `__kurio.clock` (servidor) e `page.clock` (navegador) juntos
  nos testes sensíveis a tempo.

## Testes

`npm run test` → `src/mocks/server.test.ts` (27 testes via `msw/node`, sem latência): catálogo/facetas, auth e
rotação de refresh, isolamento por usuário, carrinho/merge/limites, cotação/cupons/revisão, idempotência,
revalidação, confirmação/recibo/eventos, liquidação preguiçosa e os cenários principais.
