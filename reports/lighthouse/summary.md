# Lighthouse — resultados

Gerado em 2026-10-28T02:15:36.533Z por `npm run lh` (script: `scripts/lighthouse.ts`, config: `scripts/lighthouse.config.ts`).

## Pontuação (mediana de 3 medições)

| Página | Perfil | Performance (≥90) | Accessibility (≥95) | Best Practices (≥95) | SEO (≥90) |
| --- | --- | ---: | ---: | ---: | ---: |
| Início | mobile | 84 ❌ | 97 ✅ | 100 ✅ | 100 ✅ |
| Início | desktop | 98 ✅ | 97 ✅ | 100 ✅ | 100 ✅ |
| Detalhe do NFT | mobile | 88 ❌ | 97 ✅ | 100 ✅ | 100 ✅ |
| Detalhe do NFT | desktop | 99 ✅ | 97 ✅ | 100 ✅ | 100 ✅ |

## Métricas de carga (mediana)

| Página | Perfil | LCP | CLS | TBT | FCP | Performance por medição |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Início | mobile | 3522 ms | 0.000 | 226 ms | 2276 ms | 85 / 81 / 84 |
| Início | desktop | 1089 ms | 0.000 | 1 ms | 682 ms | 98 / 98 / 98 |
| Detalhe do NFT | mobile | 3253 ms | 0.000 | 163 ms | 2231 ms | 87 / 89 / 88 |
| Detalhe do NFT | desktop | 933 ms | 0.000 | 0 ms | 640 ms | 98 / 99 / 99 |

## Ambiente e condições de execução

- **Alvo:** build `demo` otimizado (`vite build --mode demo`, mocks MSW ligados, cenário padrão), servido por `vite preview` em http://localhost:4173
- **Medições:** 3 por página e perfil; cada uma com um Chrome novo (sem cache nem Service Worker de execuções anteriores)
- **Ferramentas:** Lighthouse 13.5.0 (pacote ^13.5.0) · Chrome: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.0.0 Safari/537.36 · Node v22.22.2
- **Sistema:** win32 10.0.26300 (x64) · CPU: 11th Gen Intel(R) Core(TM) i7-11800H @ 2.30GHz × 16 · RAM: 31.7 GB
- **Throttling (mobile):** simulate (RTT 150 ms, 1638 Kbps, CPU 4x); o perfil desktop usa o preset desktop do Lighthouse
- **Relatórios completos:** `reports/lighthouse/<pagina>-<perfil>.html|json` (execução mediana) e `reports/lighthouse/results.json` (todas as medições)

> Resultados abaixo da meta devem ser justificados em `docs/PERFORMANCE.md` (causas, não simplificações da página).
