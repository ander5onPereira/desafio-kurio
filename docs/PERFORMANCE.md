# Performance — Lighthouse

> **Status:** medição real do build `demo` (Lighthouse 13.5.0, Chrome 156, Windows, 3 medições por página/perfil). Fonte dos números:
> `reports/lighthouse/summary.md` e `results.json`. Refazer com `npm run lh` após qualquer otimização e atualizar esta página.

## Como medir

```bash
npm run lh            # builda o demo, sobe o preview, 3 medições × 2 páginas × 2 perfis, mediana
LH_SKIP_BUILD=1 npm run lh   # reaproveita o dist/ atual
LH_URL=https://… npm run lh  # audita um servidor já publicado
```

- Config versionada: `scripts/lighthouse.config.ts` (páginas, perfis, metas, nº de medições).
- Páginas: **Início** (`/`) e **Detalhe do NFT** (`/nft/emerald-ape-042`).
- Perfis: **mobile** (emulação padrão do Lighthouse: Moto G Power, CPU 4×, 4G lento) e **desktop** (preset desktop).
- Alvo: build **otimizado** `demo` (mocks MSW ligados, cenário padrão) servido pelo `vite preview` — sem simplificações para melhorar a pontuação.
- Cada medição usa um Chrome novo (sem cache nem Service Worker de execuções anteriores).
- Saída: `reports/lighthouse/<pagina>-<perfil>.html|json` (execução mediana), `results.json` (todas as medições) e `summary.md`
  (medianas, LCP/CLS/TBT, versões de Lighthouse/Chrome/Node, SO, CPU e condições de execução).

## Metas

| Categoria | Meta |
| --- | ---: |
| Performance | ≥ 90 |
| Accessibility | ≥ 95 |
| Best Practices | ≥ 95 |
| SEO | ≥ 90 |

## Resultados (mediana de 3)

| Página | Perfil | Perf (≥90) | A11y (≥95) | BP (≥95) | SEO (≥90) | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início | mobile | **84 ❌** | 97 ✅ | 100 ✅ | 100 ✅ | 3522 ms | 0.000 | 226 ms |
| Início | desktop | 98 ✅ | 97 ✅ | 100 ✅ | 100 ✅ | 1089 ms | 0.000 | 1 ms |
| Detalhe | mobile | **88 ❌** | 97 ✅ | 100 ✅ | 100 ✅ | 3253 ms | 0.000 | 163 ms |
| Detalhe | desktop | 99 ✅ | 97 ✅ | 100 ✅ | 100 ✅ | 933 ms | 0.000 | 0 ms |

Variação entre as 3 medições: Início mobile 85 / 81 / 84; Detalhe mobile 87 / 89 / 88 (ruído de ±3 pontos entre execuções). Os valores exatos de cada rodada ficam em
`reports/lighthouse/summary.md` e `results.json`.

**Metas atendidas:** Accessibility, Best Practices e SEO em todas as páginas e perfis; Performance no desktop; CLS < 0.1 em todos os casos.
**Metas NÃO atendidas:** Performance no **mobile** (Início 84, Detalhe 88; eram 77 e 83) — justificativa abaixo.

## Análise e justificativas (mobile < 90)

Condição de teste: emulação mobile do Lighthouse (Moto G Power, **CPU 4× mais lenta**, 4G lento: RTT 150 ms, 1638 Kbps), em build `demo` **com o servidor simulado (MSW) dentro da página**.

| Causa | Evidência no relatório | Efeito |
| --- | --- | --- |
| **O servidor simulado entra no caminho crítico** | O chunk dos mocks (`enable-*.js`: MSW, handlers, fixtures) tem **~61 KB gzip** (eram ~177 KB; ver "O que foi feito") e ainda ~700 ms de scripting na CPU 4×; o Service Worker precisa subir antes da 1ª requisição | Continua sendo a etapa mais cara do boot: atrasa app, rota, dados e imagem, a maior parcela do LCP |
| **Dados só chegam depois do boot** | `LCP breakdown`: *resource load delay* ≈ **480 ms**; cadeia HTML → JS → mocks → app → rota → API → imagem | A imagem do LCP (1º card do catálogo) só é descoberta depois da resposta da API |
| **Volume total de JS** | ~380 KB gzip até o 1º conteúdo (React/Zod 96, mocks 61, UI 62, App 46, axios+tailwind-merge 34, roteador 20…); `unused-javascript` ≈ 80 KiB | TBT de 267 ms (Início) e 149 ms (Detalhe); FCP ≈ 2,6 s |
| **CSS bloqueando a renderização** | `render-blocking`: ~150 ms (10 KB) | Atraso no FCP |

Esses custos são do **ambiente de mocks exigido pelo desafio**; não foram escondidos para "ganhar pontos" (a auditoria carrega o build `demo` completo, com imagens, fontes e funcionalidades). No desktop a mesma página atinge 97 / 98.

### O que foi feito
- **Cookie store do MSW removido do build (mocks 177 → 61 KB gzip; Início mobile 77 → 84, Detalhe 83 → 88):** o MSW embute `tough-cookie` e, por baixo, `tldts` (a lista de sufixos públicos, **250 KB de fonte = ~53 % do chunk dos mocks**) só para o seu cookie store, que é consultado em toda requisição interceptada. A API simulada não usa cookies (a sessão vai por token), então `vite.config.ts` aponta `tough-cookie` para `src/mocks/shims/toughCookie.ts` (jar sempre vazio). Nenhuma funcionalidade da entrega muda. A estimativa anterior deste documento (25–30 KB) estava errada: a lista é muito mais pesada do que parecia.
- **CLS 0,067 → 0,000 (Início mobile):** o skeleton do hero tinha 224 px e o hero carregado, 381 px; agora o skeleton reserva a mesma altura (slide + faixa dos pontos) e o `AppCarousel` reserva a faixa dos pontos antes do embla inicializar.
- **CLS 0,125 → 0,000 (Detalhe desktop):** o culpado era o **rodapé** (visível sob o skeleton curto e empurrado quando o conteúdo chegava); o skeleton do detalhe passou a ocupar ao menos a altura da tela.
- **`robots.txt`:** sem ele o SPA devolvia HTML e o Lighthouse contava 20 erros (SEO 92 → 100).
- **`aria-label` do painel de cenários** passou a conter o texto visível (regra `label-content-name-mismatch` do axe).

### O que foi tentado e descartado
- **Baixar o chunk do App em paralelo ao dos mocks** (`Promise.all` no boot) **e `<link rel="modulepreload">` dos chunks do boot no HTML:** os dois **pioraram** (FCP 2,6 → 3,05 s com `Promise.all`; 2,3 → 3,6 s com modulepreload). Na rede simulada a banda é dividida e o total de bytes é o mesmo, então o ganho de latência não compensa. O boot segue serial (comentado em `src/main.tsx`).
- **Carregar as *features* do Motion sob demanda** (`LazyMotion` com `import()`; −19 KB gzip do App): nota igual dentro do ruído, descartado para não adiar animações sem ganho.
- **`content-visibility: auto` nas seções abaixo da dobra** e **montar o painel de cenários em `requestIdleCallback`:** sem ganho (85 → 85) e pior (TBT 204 → 294 ms, porque o trabalho cai dentro da janela do TBT), respectivamente.

### Achado sobre a medição: o service worker e os bytes

O Lighthouse (modelo Lantern, `simulate`) **não cobra bytes de resposta servida por Service Worker**: no relatório, todo chunk, imagem e fonte pedido depois que o MSW assume a página aparece com 0 KB de transferência. Só entram na conta o HTML, o `index`, o CSS e o chunk dos mocks, ou seja, o que é baixado **antes** do worker. Por isso a pontuação acima é, em parte, favorecida pelo comportamento padrão do MSW (o worker intercepta *todas* as requisições).

Teste de controle: um worker que ignora tudo fora de `/api/**` (o que é melhor para um usuário real: a avaliação de scripts caiu de 1382 para 920 ms a 4×, porque cada chunk/imagem deixa de fazer a viagem worker → página → handlers → "não tratado") **derrubou a nota para 72 (Início) e 78 (Detalhe)**, porque agora os ~250 KB de chunks, as imagens e a fonte voltam a ser cobrados. O filtro **não foi mantido** (o comportamento padrão do MSW fica), mas o número honesto de uma rede 4G lenta com CPU 4× está mais perto desse segundo resultado do que de 84/88. Há ainda a latência de 80–200 ms por chamada que o cenário `default` simula de propósito (skeletons visíveis, realismo da demo); ela entra no tempo de resposta observado.

### O que ainda poderia melhorar o mobile
0. **Passar a medir a demo publicada** (`LH_URL=https://… npm run lh`): o nginx serve brotli e cabeçalhos de cache reais, que o `vite preview` não tem.
1. **Hidratar o catálogo de um snapshot embutido** (a 1ª página é estática): a imagem do LCP seria descoberta sem esperar a API — mas isso é uma simplificação exclusiva para a nota (o README proíbe), por isso não foi feito.
2. **Dividir mais o JS** (`unused-javascript`): `Select`, `Slider` e `Carousel` entram no chunk `ui` mesmo antes da interação; carregá-los sob demanda tiraria ~25 KB gzip.
3. **Servir o build de produção real com HTTP/2, brotli e cache** (a avaliação roda no `vite preview`, sem brotli): o deploy na VPS comprime com gzip/brotli e deve reduzir o tempo de transferência.

## Decisões que afetam a performance

- **Imagens:** 4 artes-base de 250×250 px servidas em AVIF/WebP (`public/img/`), `width`/`height` explícitos, `loading="lazy"` (a 1ª fileira e a imagem do detalhe têm prioridade).
  As fontes originais têm só 250 px: **não há upscale** (limitação do asset; ver `ARCHITECTURE.md`).
- **Fonte:** Roboto Mono variável, self-hosted (fontsource), `font-display: swap`.
- **Code splitting:** por rota (TanStack Router `autoCodeSplitting`) e chunk separado para o código dos mocks (carregado por `import()` no boot).
- **Skeletons com dimensões fixas** (sem deslocamento de layout) e Motion com `LazyMotion`/`m.*`.
- **Mocks no caminho crítico:** o MSW precisa subir antes da 1ª requisição (o chunk dos mocks pesa ~61 KB gzip). Esse custo é real no build `demo`,
  que é o que a avaliação mede; ele é reportado, não escondido.
