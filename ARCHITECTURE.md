# Arquitetura — Kurio

Como a solução foi montada e **por quê**. Os detalhes finos ficam nos documentos de `docs/`; aqui estão as decisões, os desvios do Figma e as limitações.

## 1. Visão geral

```
┌──────────────────────────── navegador ────────────────────────────┐
│  React 19 + TanStack Router/Query                                 │
│    routes ─▶ modules/<domínio> ─▶ lib/api (Axios) ─▶ /api/**      │
│                      │                                  ▲        │
│                      └─▶ realtime (socket.io-client) ───┤ ws     │
│                                                          │        │
│  MSW (Service Worker) + @mswjs/socket.io-binding  ◀──────┘        │
│    src/mocks/**  — o "servidor": handlers, db, cenários, painel   │
└────────────────────────────────────────────────────────────────────┘
        src/contracts/**  — schemas Zod usados pelos DOIS lados
```

- **`src/contracts`** é a fonte da verdade da API: cada endpoint é declarado uma vez (`defineEndpoint`: método, caminho, schemas de params/corpo/resposta/erros). O app chama `callEndpoint(endpoints.x.y, …)` (valida entrada e saída) e os handlers do MSW derivam dos mesmos contratos. Resultado: se o contrato muda, **o tipo quebra nos dois lados**.
- **Módulos por domínio** (`src/modules/*`: `api`, `hooks`, `components`, `index.ts`). Um módulo **não importa outro módulo**; o que ele expõe sai pelo `index.ts`. Composição acontece nas rotas.
- **Fronteira dos mocks:** dado fictício e “regra de servidor” (estoque, cotação, idempotência, liquidação de pedido) vivem só em `src/mocks`. Só `src/main.tsx` o importa (import dinâmico). ESLint e `npm run check-mocks` garantem isso — componentes, hooks e Axios não sabem que existe mock.

## 2. Decisões (ADRs resumidos)

| # | Decisão | Motivo |
| --- | --- | --- |
| 1 | **Contratos Zod compartilhados** entre app e mocks | Uma definição por endpoint; validação em runtime nas duas pontas; documentação gerada (`docs/CONTRACTS.md`) |
| 2 | **ETH como string decimal** + `decimal.js`, só em `src/lib/money.ts` | `number` perde precisão (0,1 + 0,2); o total oficial vem sempre da API |
| 3 | **TanStack Query** para todo estado remoto, chaves de uma fábrica única; dados privados levam o **escopo do usuário** na chave | Trocar de usuário nunca reaproveita cache do anterior (`docs/CACHE.md §1`) |
| 4 | **URL como estado do catálogo** (busca, filtros, ordenação, página) validada por Zod | Compartilhável, voltar/avançar funcionam, refresh preserva; “o que está na URL é o que vai para a API” |
| 5 | **Cotação (`quote`) separada do carrinho**, com `revision` | O total mostrado é sempre o do servidor; mudança de preço/estoque invalida a cotação e exige reconfirmação |
| 6 | **Idempotência no pedido** (`Idempotency-Key` guardada no rascunho do checkout) | Timeout, duplo clique e refresh nunca criam compra duplicada: o reenvio recupera o **mesmo** pedido |
| 7 | **Eventos com envelope** (`id`, `version`, `userScope`) + guarda pura (`EventGuard`) | Duplicados, antigos e de outro usuário são descartados; ver §5 |
| 8 | **Mocks como servidor de verdade**: db persistido, cenários determinísticos, `window.__kurio` | Os testes e a avaliação exercitam falhas reais pelo Axios e pelo `socket.io-client`, nunca por atalhos no cliente |
| 9 | **Componentes `App*`** (cva + Radix + `forwardRef`) sobre tokens CSS | Identidade própria e consistente; nenhum HEX fora de `tokens.css`; shadcn/Radix como base de acessibilidade |
| 10 | **Skeleton com shimmer, nunca spinner de tela cheia**; todo componente com dados trata Loading · Empty · Error · Success · Offline | Sem salto de layout e sem tela “morta” |
| 11 | **Playwright contra o build `demo`** (o mesmo que é publicado) | Testa o artefato real, com service worker e websocket simulado |

## 3. Sessão

- Login/cadastro devolvem `accessToken` (curto) e `refreshToken`; a sessão fica em `localStorage` (`kurio.session`) para sobreviver ao refresh. **Limitação:** o MSW não emite cookie `HttpOnly`; em produção o refresh iria em cookie `HttpOnly` + `SameSite`, não em storage legível.
- O interceptor do Axios anexa o token. Em `401 SESSION_EXPIRED` faz **um** refresh compartilhado (single-flight, ainda que várias chamadas falhem juntas) e repete a chamada uma vez. Se o refresh falhar, a sessão é encerrada, o app leva ao login **preservando a rota** (`?redirect=`) e o contexto do checkout.
- **Logout e troca de usuário** limpam o cache (`queryClient.clear()`), o armazenamento privado (rascunho do checkout, preferências da cotação) e desconectam o socket. Eventos de outra sessão chegam com `userScope` diferente e são descartados.
- Rotas privadas ficam sob `_auth` (guard no `beforeLoad`) e `redirect` só aceita caminhos internos.

## 4. Carrinho

- **Visitante:** o carrinho vive no servidor, identificado por `X-Cart-Id` (guardado no cliente). **Ao autenticar**, o carrinho do visitante é **mesclado** ao do usuário (`modules/cart/bridge.ts`).
- Cada linha é `nftId:editionId` (a edição define estoque e preço). Quantidade limitada por estoque da edição e `maxPerOrder`.
- Mudanças de quantidade e remoção são **otimistas** com rollback, e **serializadas** por escopo para evitar corrida.
- O estado da linha (`price-changed` / `limited` / `unavailable`) é **derivado** do estoque/preço atuais, não armazenado. Preço ou estoque alterados em tempo real aparecem como aviso `role="status"` com antes/depois.
- Estoque só baixa — e o carrinho só perde os itens comprados — **na confirmação** do pedido.

## 5. Cache e reconciliação REST ↔ Socket.IO

Política completa em [`docs/CACHE.md`](docs/CACHE.md). Em resumo:

- Padrões: `staleTime` 30 s, `gcTime` 5 min; carrinho/cotação/pedido com `staleTime` 0. Retry **só** para falha transitória (rede, timeout, 5xx, 429), 2 vezes, com backoff; **mutations nunca repetem sozinhas**.
- Resposta obsoleta/fora de ordem: a chave contém os parâmetros e o `AbortSignal` cancela a requisição antiga; versões (`version`) impedem sobrescrever dado novo com antigo — também no REST (“piso” por NFT).
- Eventos (`nft.updated`, `order.updated`) passam pela `EventGuard`: `foreign` → `duplicate` → `stale` → `apply`. Aplicar é idempotente.
- **Reconexão:** eventos perdidos durante a queda não são reenviados; ao reconectar, os recursos **ativos** são revalidados por REST. Pedido pendente é acompanhado por evento **e** por polling com backoff (2→10 s), parando no estado terminal; `GET /orders?status=pending` recupera o pedido após refresh.

## 6. Transporte Socket.IO simulado

O `@mswjs/socket.io-binding` (0.2.0) intercepta o WebSocket do navegador. Consequências assumidas:

- Só transporte **`websocket`** (sem long-polling), namespace padrão, eventos de texto: **sem acks, sem binário, sem rooms/broadcast**. O isolamento por usuário é feito pelo mock (`userScope` + broadcaster por usuário), não por rooms.
- O `socket.io-client` precisa ser importado **depois** de `worker.start()`: o engine.io captura o `WebSocket` ao carregar o módulo. Por isso o import é dinâmico, dentro de `connect()`, e o boot é serial (`main.tsx`).
- O handler responde ao handshake Engine.IO, envia ping a cada 20 s e repassa conexões que não são do app (ex.: HMR do Vite).
- Em produção real o servidor Socket.IO usaria acks e rooms por usuário; o contrato de eventos (`src/contracts/events.ts`) não depende disso.

## 7. Acessibilidade

Requisito de projeto, não polimento: labels e `aria-describedby` nos erros de campo (`AppFormField`), foco visível global, foco preso/devolvido em diálogos e drawers, `role="status"` em feedback de mutations e tempo real, `role="alert"` em erros, estados que não dependem só de cor, `prefers-reduced-motion` respeitado (shimmer e Motion), alvos de toque amplos no mobile e contraste dos tokens validado por `npm run contrast` (AA). Varredura **axe** (wcag2a/aa/21aa + best-practice) nas telas principais, em desktop e mobile, como parte do E2E.

## 8. Desvios do Figma

| Item | Decisão |
| --- | --- |
| **Tema** | O Figma só define o tema escuro: a aplicação é **dark-only** (os tokens são variáveis CSS e comportariam um tema claro) |
| **Fonte** | Roboto Mono variável, self-hosted (fontsource), conforme o Figma |
| **Busca** | Campo de busca na sidebar do catálogo (desktop); o Figma só tem o ícone de busca no header. Necessário para o requisito de busca. No mobile, o FAB central da barra inferior abre o diálogo de busca (ação não definida no Figma) |
| **Faixa de preço** | Exibida com vírgula (`0,02 - 12,30 ETH`) como no Figma; valores na URL/API são strings com ponto |
| **Aba “Detalhes do NFT”** | Rótulos “Contrato” e “Direitos autorais” corrigidos (no Figma estão trocados) |
| **Ícones de marca** | Lucide não inclui marcas: redes sociais com SVGs de traço próprios; glifos de Google/Facebook em `currentColor` (sem cores de marca, regra de tokens) |
| **Itens fora de escopo** | Newsletter, links do rodapé, Criadores, Aprenda, “Ler mais”, redes sociais: desabilitados com “em breve” — nunca aparentam sucesso |
| **Header no mobile** | Cada página usa `MobileTopBar`/`MobileSearchBar` e o `BottomNav`, como nos frames; o título quebra em até 2 linhas para caber em 360–414 px |
| **Perfil e Carteiras no mobile** | Sem frame mobile: a navegação lateral vira uma faixa horizontal rolável |
| **Carteira principal** | O link “Adicionar” foi omitido, porque o formulário já fica sempre visível |
| **Selects** | Rede, tipo de carteira e sufixo ENS usam `<select>` nativo (acessível e consistente no mobile) |
| **Ver no Etherscan** | Abre um diálogo “link simulado” (integração real com blockchain está fora do escopo) |
| **Artes** | O arquivo de assets tem 4 artes de 250×250 px: servidas em AVIF/WebP **sem upscale**; em telas grandes aparecem menores que no Figma ou levemente suavizadas |
| **Hero no mobile** | O texto do slide em 390 px é mais alto que o do frame; a altura do skeleton foi alinhada ao conteúdo para não deslocar o layout |

## 9. Limitações conhecidas

- **Servidor dentro da página:** sem sincronização entre abas/dispositivos; cada aba carrega o banco do `localStorage` no boot. Eventos em tempo real só afetam a aba onde o mock os emite.
- **Sessão em `localStorage`** (ver §3) e senhas fictícias em texto no mock: aceitável apenas para a demo.
- **Performance mobile abaixo de 90** no Lighthouse (Início 84, Detalhe 88; eram 77 e 83): o servidor simulado (≈61 KB gzip depois de remover o cookie store do MSW) fica no caminho crítico do boot do build `demo`, e o Lighthouse não cobra os bytes servidos pelo service worker (ver o achado em [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md)). Desktop: 98–99; Accessibility 97, Best Practices 100, SEO 100 em todos os casos.
- **Regressão visual:** as baselines dependem do sistema operacional (renderização de fonte). As versionadas devem ser geradas no mesmo ambiente do CI/Linux; em outra máquina use `npm run e2e:update` e revise o diff.
- **Teclado no mobile:** 12 testes são pulados de propósito nos projetos mobile (interações só de teclado).
- **Integrações reais** (blockchain, extensões de carteira, gateway de pagamento) estão fora do escopo; carteiras e pagamento são simulados.
- **Notificações e e-mails** (confirmação de pedido, newsletter) não são enviados.

## 10. Verificação

`npm run check` (tipos, ESLint, 91 testes Vitest, contraste, fronteira dos mocks) · `npm run e2e` (12 grupos do enunciado em desktop e mobile, responsividade em 390/768/1440 e regressão visual) · `npm run lh`. Estratégia em [`docs/TESTING.md`](docs/TESTING.md).
