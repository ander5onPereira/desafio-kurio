# Mocks (MSW) — resumo e uso nos testes

> A referência completa (estrutura, regras de negócio, tabela de cenários, transporte Socket.IO) está em
> **[`src/mocks/README.md`](../src/mocks/README.md)**, mantida junto do código. Este documento resume o essencial
> para quem executa e testa o projeto.

## O que é

Todo dado fictício e toda regra de "servidor" vivem **só** em `src/mocks/`. Componentes, hooks e o cliente Axios **não** contêm respostas
fictícias nem caminhos alternativos: só `src/main.tsx` importa os mocks (import dinâmico) quando `VITE_ENABLE_MOCKS=true`.
A fronteira é garantida por `npm run check-mocks` e por uma regra do ESLint (`no-restricted-imports`).

- **REST:** handlers MSW derivados do **mesmo registro de contratos** do app (`src/contracts/endpoints.ts`): path, body, query e resposta
  usam os schemas Zod. Resposta fora do contrato vira `500` visível, então o mock não diverge do app.
- **Tempo real:** `ws.link` + `@mswjs/socket.io-binding` ↔ `socket.io-client` real. Toda mudança de dado passa por um serviço que publica o evento
  correspondente, então REST e Socket.IO são sempre coerentes.
- **Estado:** banco em memória, persistido em `localStorage` (`kurio.mockdb.v1`) para sustentar refresh; `reset` restaura um cenário conhecido.
- **Determinismo:** sem `Math.random` (PRNG semeado) e relógio injetável.

## Ativação e seleção de cenário

| Como | Exemplo |
| --- | --- |
| Variável de ambiente (build) | `VITE_ENABLE_MOCKS=true`, `VITE_MOCK_SCENARIO=default` (`.env.development` e `.env.demo`) |
| URL | `/?scenario=figma` (`&reset=1` força reset). `scenario` e `reset` valem **uma vez**: saem da URL no boot (os demais parâmetros ficam), então o F5 mantém o estado e a troca feita pelo painel não é desfeita |
| Painel flutuante | botão **"Mock · <cenário>"** no canto inferior esquerdo (só com mocks ligados). Arrastável com mouse, toque ou caneta; a posição fica em `localStorage` (`kurio.mockpanel.v1`) e o botão "Posição original" do painel a restaura. Cada cenário mostra um **"Como ver"** (definido em `tryIt` de `scenarios/definitions.ts`); "Aplicar e resetar" recarrega a página e o painel reabre com a confirmação; "Aplicar e abrir a tela de teste" leva à tela onde o efeito aparece. Fora de `default`/`figma` o botão fica em **amarelo** e ganha o atalho **"Restaurar default"** (mantém sessão, carrinho e pedidos). Com um modal aberto (login, cadastro) o app deixa o resto da página inerte, inclusive o painel: só o botão e o atalho continuam clicáveis |
| Console / testes | `await __kurio.scenario.set("order-timeout")` |

Trocar de cenário **restaura o banco**; use `{ keepData: true }` para só mudar o comportamento. **Reset:** `await __kurio.reset()` (recarregue a página
para limpar o cache do app) ou o botão de reset do painel.

## Dados de teste

| O quê | Valor |
| --- | --- |
| Usuários | `ana@kurio.test` · `bruno@kurio.test` — senha `Kurio@2026` |
| Cupons | `KURIO10` (válido, 10%) · `EXPIRADO20` (expirado) · `INVALIDO` (inexistente) · `TAXA0` (taxa de rede grátis) |
| Código de indicação | `KURIO-2026` |
| NFT principal dos testes | `emerald-ape-042` (edições `ed-1-1`, `ed-1-10`, `ed-1-50`, `ed-open`) |

Esses dados valem nos cenários `default` e `figma`. Os outros falham de propósito: `offline` derruba o login ("Sem conexão com o servidor"), `client-errors` quebra a página do NFT e o carrinho, `coupon-invalid` / `coupon-expired` recusam qualquer cupom e `register-conflict` recusa o cadastro. O app não sabe que o erro é simulado, então confira o rótulo do botão **"Mock · <cenário>"** antes de achar que o dado de teste está errado.

## Cenários determinísticos

`default` · `figma` · `empty` · `slow` · `variable-latency` · `out-of-order` · `offline` · `server-errors` · `client-errors` · `session-expired` ·
`unauthorized` · `register-conflict` · `coupon-invalid` · `coupon-expired` · `price-changed-on-checkout` · `sold-out-on-checkout` · `order-timeout` ·
`payment-confirmed` · `payment-declined` · `wallet-rejected` · `socket-drop`. Descrição de cada um em [`src/mocks/README.md`](../src/mocks/README.md#cenários).

### Como reproduzir os fluxos de falha

| Quero ver… | Faça |
| --- | --- |
| Skeletons (carregamento lento) | `/?scenario=slow` |
| Erro de conexão e recuperação | `/?scenario=offline`, depois `__kurio.scenario.set("default", { keepData: true })` e "Tentar novamente" |
| Respostas fora de ordem | `/?scenario=out-of-order` e digite duas buscas seguidas |
| Cupom inválido / expirado | cupom `INVALIDO` / `EXPIRADO20` no carrinho |
| Preço mudou na compra | `?scenario=price-changed-on-checkout` e confirme o pedido |
| Edição esgotada na compra | `?scenario=sold-out-on-checkout` |
| Timeout após criar o pedido | `?scenario=order-timeout` → "Tentar novamente" recupera o **mesmo** pedido |
| Pagamento recusado | `?scenario=payment-declined` |
| Sessão expirada | `__kurio.scenario.set("session-expired", {keepData:true})` + `__kurio.clock.set(<data futura>)` e navegue |
| Queda do websocket com pedido pendente | `?scenario=socket-drop` |
| Mudança de preço em tempo real | painel → "NFT" (id, preço) ou `__kurio.nft.update("emerald-ape-042", { price: "1.49", editionId: "ed-1-50" })` |

## Control plane — `window.__kurio`

Só existe com mocks ligados. Atua no **servidor simulado**; o app recebe tudo pelo Axios e pelo `socket.io-client` reais (nunca por setters).

```ts
__kurio.scenario.set(id, { keepData? }) · .current() · .list()
__kurio.reset(id?)
__kurio.inject({ method?, path, behavior, times? }) · .clearInjections()
__kurio.nft.update(id, { price?, available?, editionId? })   // muda o db → REST + evento nft.updated
__kurio.order.settle(orderId, "confirmed" | "declined")
__kurio.socket.drop() · .restore() · .replay(eventId) · .emitStale(nftId) · .emitted()
__kurio.clock.set(iso) · .reset()
```

No Playwright isso é feito por `page.evaluate` — o `APIRequestContext` roda **fora** do navegador e **não** passa pelo MSW. O wrapper tipado está em
`e2e/fixtures/kurio.ts` (`kurio.open`, `setScenario`, `inject`, `updateNft`, `replayEvent`, `emitStale`, `dropSocket`, `serverFetch`, `afterResponse`…).

## Transporte Socket.IO e limitações

- Só **`websocket`** (sem long-polling), namespace padrão, eventos de texto: **sem acks, sem binário, sem rooms**
  (limitações do `@mswjs/socket.io-binding`). O isolamento por usuário é feito pelo mock (`userScope` + broadcaster por usuário).
- O `socket.io-client` precisa ser carregado **depois** de `worker.start()` (import dinâmico), senão o `engine.io-client` captura o
  `WebSocket` original e a conexão escapa do mock.
- O mock envia ping a cada 20 s; eventos perdidos durante uma queda **não** são reenviados — o cliente reconcilia por REST
  ([CACHE.md §6](./CACHE.md)).

## Limitações do ambiente de mocks

- O "servidor" roda dentro da página: **sem sincronização entre abas/dispositivos** (cada aba carrega o banco do `localStorage` no boot).
- O MSW não emite cookies `HttpOnly`: a sessão é um token opaco guardado pelo cliente (em produção o refresh iria em cookie `HttpOnly`).
- O worker e o código dos mocks entram no caminho crítico do boot do build `demo` (precisam subir antes da 1ª requisição) — impacto
  medido em [PERFORMANCE.md](./PERFORMANCE.md).
