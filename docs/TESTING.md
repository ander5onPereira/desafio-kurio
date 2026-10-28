# Testes

| Camada | Ferramenta | Comando | Escopo |
| --- | --- | --- | --- |
| Lógica pura | Vitest | `npm run test` | dinheiro (`money`), guarda de eventos, máquina de checkout, search params, handlers do mock (via `msw/node`) |
| Fluxos, falhas, tempo real, a11y e responsividade | Playwright | `npm run e2e` | os 12 grupos do README, contra o build **demo** (mocks ligados) |
| Regressão visual | Playwright (`toHaveScreenshot`) | `npm run e2e` / `npm run e2e:update` | início, detalhe, carrinho e pagamento × desktop e mobile |
| Performance/qualidade | Lighthouse | `npm run lh` | início e detalhe × mobile e desktop, mediana de 3 medições |

## Playwright

```bash
npm run e2e                      # builda o demo, sobe o preview (4173) e roda tudo
E2E_DEV=1 npm run e2e            # usa o servidor de dev (5173): mais rápido ao desenvolver
E2E_BASE_URL=http://host:porta npm run e2e   # contra um servidor que já está no ar
npx playwright test e2e/specs/cart.spec.ts --project=chromium-desktop
npx playwright show-report reports/playwright # relatório HTML
```

- **Execução isolada** (máquina compartilhada ou várias execuções em paralelo): `E2E_PORT` (porta do preview, padrão 4173), `E2E_DIST` (pasta do build
  demo, padrão `dist`), `E2E_OUTPUT_DIR` (resultados, padrão `test-results`) e `E2E_REPORT_DIR` (relatório HTML, padrão `reports/playwright`). Sem isso, duas
  execuções simultâneas disputam a porta 4173 e apagam os resultados uma da outra.
- **Projetos:** `chromium-desktop` (1440×900), `chromium-mobile` (390×844, `isMobile`) rodam tudo; `chromium-tablet` (768×1024) roda a
  responsividade (`e2e/specs/responsive.spec.ts`, que também cobre 390 e 1440).
- **Isolamento:** cada teste usa um **contexto de navegador novo** (localStorage vazio ⇒ o mock parte do seed). `kurio.reset()` volta ao seed no
  meio do teste. Contas criadas por `createAccount()` nascem sem carteiras, favoritos nem pedidos.
- **Servidor simulado:** `e2e/fixtures/kurio.ts` fala com `window.__kurio` por `page.evaluate` (o `APIRequestContext` não passa pelo MSW). Asserções
  observam a **interface e o resultado da operação** (ex.: `listOrders(kurio)` consulta os pedidos no servidor simulado).
- **Tempo:** `page.clock` (navegador) + `__kurio.clock` (servidor) nos cenários sensíveis; nada de `waitForTimeout` — use `expect.poll`, auto-wait e
  `kurio.afterResponse(...)` (espera a resposta da API antes de, por exemplo, recarregar a página).
- **Relatório e traces:** HTML em `reports/playwright/` e `trace: 'retain-on-failure'` (abra com `npx playwright show-trace <trace.zip>`).

### Mapa dos 12 grupos do README

| # | Grupo | Spec |
| --- | --- | --- |
| 1 | Busca, filtros, ordenação, paginação e histórico | `catalog.spec.ts` |
| 2 | Detalhe direto, NFT inexistente, edição indisponível, limite | `detail.spec.ts` |
| 3 | Cadastro, login, expiração, logout, troca de usuário | `auth.spec.ts` |
| 4 | Favoritos (falha de mutation e recuperação) | `favorites.spec.ts` |
| 5 | Carrinho, cupom, persistência, merge ao autenticar | `cart.spec.ts` |
| 6 | Compra completa até o recibo | `purchase.spec.ts` |
| 7 | Pagamento recusado, clique repetido, timeout com recuperação | `checkout-failures.spec.ts` |
| 8 | Perfil, avatar, senha e carteiras com erros de validação | `account.spec.ts` |
| 9 | Preço/disponibilidade via Socket.IO no checkout | `realtime-checkout.spec.ts` |
| 10 | Eventos duplicados/antigos, desconexão, pedido pendente | `realtime-resilience.spec.ts` |
| 11 | Teclado, foco de diálogos, validação de formulários (+ axe) | `a11y.spec.ts` |
| 12 | Skeletons em carga lenta, falha e recuperação | `loading-errors.spec.ts` |
| — | Overflow horizontal em 390/768/1440 e zoom | `responsive.spec.ts` |
| — | Seleção e reset de cenários do mock (URL e painel "Mock · …") | `mock-control.spec.ts` |
| — | Regressão visual | `e2e/visual/visual.spec.ts` |

## Regressão visual — baselines só de Linux

As capturas dependem do sistema operacional (renderização de fonte e antialiasing). Por isso:

- as baselines versionadas são **as geradas em Linux** (runner do GitHub Actions ou a imagem Docker oficial do Playwright);
- as geradas em Windows/macOS são ignoradas pelo Git (`e2e/.gitignore`: `*-win32.png`, `*-darwin.png`) e servem só para olhar localmente;
- para (re)gerar no Linux:

```bash
docker run --rm -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v1.64.1-jammy \
  sh -c "npm ci && npx playwright test e2e/visual --update-snapshots"
```

  (use a versão da imagem igual à do `@playwright/test` do `package.json`), ou rode o workflow de CI que atualiza os snapshots.
- Dados estáveis: cenário `figma`, `page.clock` fixo, `animations: 'disabled'`, fontes e imagens aguardadas e o botão do painel do mock mascarado.

## Acessibilidade automatizada

`expectNoA11yViolations(page)` (`@axe-core/playwright`, WCAG 2.0/2.1 A e AA) falha com violações **sérias ou críticas** e lista regra e seletores.
O painel flutuante do mock é excluído (ferramenta de teste, não UI do produto). Além do axe: ordem de Tab, indicador de foco, foco preso em
diálogo com `Esc`, erros de campo ligados por `aria-describedby`, `prefers-reduced-motion`.
