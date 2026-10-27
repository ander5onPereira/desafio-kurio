/**
 * Configuração VERSIONADA da auditoria Lighthouse (README §10).
 * Qualquer mudança aqui deve ser justificada em docs/PERFORMANCE.md.
 */
export const LIGHTHOUSE_CONFIG = {
  /** Porta do `vite preview` do build demo (mocks ligados, cenário padrão). `LH_PORT` sobrescreve. */
  port: Number(process.env.LH_PORT ?? 4173),
  /** Medições por página e perfil; o relatório usa a MEDIANA. */
  runs: 3,
  /** Páginas auditadas (o NFT do detalhe é o Emerald Ape #042 do cenário padrão). */
  pages: [
    { id: "inicio", label: "Início", path: "/" },
    { id: "detalhe", label: "Detalhe do NFT", path: "/nft/emerald-ape-042" },
  ],
  /** Perfis: mobile = emulação padrão do Lighthouse (Moto G Power, 4x CPU, 4G lento); desktop = preset desktop. */
  profiles: ["mobile", "desktop"],
  categories: ["performance", "accessibility", "best-practices", "seo"],
  /** Metas do desafio (pontuação 0–100). */
  targets: { performance: 90, accessibility: 95, "best-practices": 95, seo: 90 },
  outputDir: "reports/lighthouse",
} as const;

export type ProfileId = (typeof LIGHTHOUSE_CONFIG.profiles)[number];
export type CategoryId = (typeof LIGHTHOUSE_CONFIG.categories)[number];
