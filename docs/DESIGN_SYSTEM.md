# Design System Kurio

Biblioteca de componentes `App*` do Kurio (padrão do meu Design System ARPDev, adaptado à identidade do Figma).
Vitrine viva: rota **`/design-system`** (só existe nos builds com mocks — dev e demo).

## Princípios
- **Tokens, nunca HEX.** Os únicos valores de cor ficam em `src/styles/tokens.css`; o Tailwind v4 remove a paleta padrão (`--color-*: initial`), então só as classes dos tokens existem (`bg-card`, `text-muted-foreground`, `border-border`…).
- **Dark-only.** O Figma só define o tema escuro (desvio do meu padrão "dark + light", documentado em `ARCHITECTURE.md`). Os tokens são variáveis CSS e comportariam um tema claro.
- **Skeleton com shimmer, nunca spinner de tela cheia.** Dimensões fixas → CLS ≈ 0. `prefers-reduced-motion` → bloco estático.
- **Todo componente com dados trata** Loading · Empty · Error · Success · Offline.
- **Acessibilidade é requisito:** foco visível global, `aria-*` nos campos, foco preso/devolvido em diálogos, anúncios por live region, estados nunca só por cor.

## Tokens (`src/styles/tokens.css`)

| Grupo | Token | Valor (Figma) | Uso |
| --- | --- | --- | --- |
| Superfície | `background` | `#140D0A` | Fundo da página |
| | `card` | `#241612` | Cards, linhas, sidebar |
| | `strip` | `#38220F` | Faixa marrom do rodapé, campo da newsletter |
| | `border` / `input` | `#432C1A` | Linhas e bordas |
| Texto | `foreground` | `#F5F1EB` | Títulos e texto principal |
| | `muted-foreground` | `#CFB28C` | Texto auxiliar |
| | `subtle-foreground` | `#B39463` | Placeholders, metadados |
| | `accent-foreground` | `#E89B55` | Destaque em texto (aba/nav ativa, asterisco) |
| Marca | `primary` / `-hover` / `-pressed` | `#D28A4C` / `#DD9A5F` / `#BF7A3E` | CTAs, preço, foco |
| | `primary-foreground` | `#140D0A` | Texto sobre botão primário |
| Estados | `danger`, `success`, `warning`, `info` (+ `-surface`) | — | Sempre com ícone + texto |
| Raios | `xs 2 · sm 4 · md 8 · lg 12 · xl 16 · 2xl 24` | | Cards ~8; botões/inputs 4 (desktop) e 12 (mobile) |

O contraste de todos os pares de texto é validado por `npm run contrast` (mínimo 4.5:1; falha o CI).

- **Tipografia:** Roboto Mono (variável, self-hosted via `@fontsource-variable/roboto-mono`) em TODA a interface; números com `tabular-nums`.
- **Espaçamento:** escala de 4 px (classes padrão do Tailwind); sem valores arbitrários.
- **Breakpoints:** `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1440`; mobile-first; avaliados em 390 / 768 / 1440. Coluna de conteúdo: `Container` (1200 px úteis em 1440).

## Componentes (`@/components/ui`, `@/components/shared`, `@/components/layout`)

Assinaturas resumidas em `docs/progress/B.md`.

| Grupo | Componentes |
| --- | --- |
| Ação | `AppButton`, `AppComingSoon` |
| Campos | `AppFormField`, `AppInput`, `AppPasswordInput`, `AppTextarea`, `AppSelect`, `AppCheckbox`, `AppRadioGroup` (`AppRadioCard`, `AppRadioChip`), `AppSlider` |
| Exibição | `AppCard`, `AppBadge`, `AppAvatar`, `AppArtwork`, `AppEthAmount`, `AppQuantityStepper` |
| Estados | `AppSkeleton` / `AppSkeletonGroup`, `AppEmpty`, `AppError`, `RoutePending` / `RouteError` / `RouteNotFound` |
| Navegação | `AppTabs`, `AppPagination`, `AppBreadcrumb`, `AppCarousel`, `Header`, `BottomNav`, `MobileSearchBar`, `MobileTopBar`, `Footer`, `SearchDialog` |
| Sobreposição | `AppModal`, `AppDrawer`, `AppConfirm`, `AppTooltip`, `AppToaster` (`toast`) |
| Acessibilidade | `AppLiveRegion` / `announce()`, skip link, `RouteAnnouncer` (foco no `<h1>` + anúncio ao trocar de caminho) |

## Padrão de implementação

`cva` (variantes) + Radix (`radix-ui`) + `forwardRef` + `displayName` + JSDoc de abertura em PT-BR (molde do `AppButton` do ARPDev). Os componentes seguem a estrutura do **shadcn/ui** (`components.json` presente), renomeados para o prefixo `App*` e adaptados aos tokens do Kurio.

## Decisões de acessibilidade e UX

- **Foco devolvido em diálogos controlados:** o Radix só restaura o foco quando há `Dialog.Trigger`; `useRestoreFocus` faz isso para modais abertos por estado.
- **Ações fora de escopo** (`AppComingSoon`): botão `aria-disabled` (continua focável), dica "Em breve", texto oculto "(em breve)"; ao ativar apenas anuncia "Esta área ainda não está disponível." — nunca aparenta sucesso. *Nos testes Playwright use `click({ force: true })`: o Playwright considera `aria-disabled` como "não habilitado".*
- **Foco ao navegar:** só quando o CAMINHO muda (não em mudança de search/hash, para não roubar o foco ao filtrar o catálogo) e nunca na primeira carga.
- **Abas (`AppTabsList`):** rolam só na horizontal. A linha-base é uma sombra interna da lista, não `border-b`, para o sublinhado de 2 px da aba ativa cobri-la sem vazar do contêiner: o vazamento criava 1 px de rolagem vertical (a barra com setas ▲▼ no Windows). Lista sem linha-base: `shadow-none`.
- **Paginação com links do Router:** `renderPage` com `<Link>` exige `activeOptions={{ exact: true }}`. Por padrão o Router marca como ativo todo link cuja busca seja subconjunto da atual (a página 1, sem `page`, casaria sempre) e sobrescreve o `aria-current`. O destaque segue a página da URL, que muda na hora do clique, e não a dos dados.
- **Botões de ícone** exigem `aria-label` (quem usa é responsável).
- **Slider** opera em inteiros (ex.: centésimos de ETH) para nunca introduzir erro de ponto flutuante.

## Desvios do Figma (Agente B)

| Item | Decisão |
| --- | --- |
| Ícones de redes sociais | Lucide 1.x não inclui marcas → SVGs de traço próprios (`BrandIcons`) |
| FAB central do bottom nav | Abre o diálogo de busca (o Figma não define a ação) |
| Newsletter / links do rodapé / Criadores / Aprenda | Desabilitados com "Em breve" (fora de escopo; nunca aparentam sucesso) |
| Header só no desktop | No mobile cada página usa `MobileTopBar` / `MobileSearchBar` e o `BottomNav` (como nos frames) |

## Definition of Done (por componente)

Responsivo sem overflow · foco visível · labels/erros associados · tokens apenas · tipado sem `any` · `prefers-reduced-motion` · estados (loading/empty/error) · sem duplicação · documentado (JSDoc + vitrine).
