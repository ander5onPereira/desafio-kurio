/**
 * Configuração VERSIONADA da auditoria Lighthouse (README §10).
 * Qualquer mudança aqui deve ser justificada em docs/PERFORMANCE.md.
 */
const ALL_PAGES = [
  { id: "inicio", label: "Início", path: "/" },
  { id: "detalhe", label: "Detalhe do NFT", path: "/nft/emerald-ape-042" },
] as const;
const ALL_PROFILES = ["mobile", "desktop"] as const;

/** Iteração local: `LH_PAGES=inicio LH_PROFILES=mobile LH_RUNS=1 LH_OUT=.scratch/lh`. A entrega usa os padrões. */
const only = <T extends { id: string }>(items: readonly T[], filter?: string) =>
  filter ? items.filter((item) => filter.split(",").includes(item.id)) : items;

export const LIGHTHOUSE_CONFIG = {
  port: Number(process.env.LH_PORT ?? 4173),
  runs: Number(process.env.LH_RUNS ?? 3),
  pages: only(ALL_PAGES, process.env.LH_PAGES),
  /** Perfis: mobile = emulação padrão do Lighthouse (Moto G Power, 4x CPU, 4G lento); desktop = preset desktop. */
  profiles: ALL_PROFILES.filter((id) => !process.env.LH_PROFILES || process.env.LH_PROFILES.split(",").includes(id)),
  categories: ["performance", "accessibility", "best-practices", "seo"],
  targets: { performance: 90, accessibility: 95, "best-practices": 95, seo: 90 },
  outputDir: process.env.LH_OUT ?? "reports/lighthouse",
} as const;

export type ProfileId = (typeof ALL_PROFILES)[number];
export type CategoryId = (typeof LIGHTHOUSE_CONFIG.categories)[number];
