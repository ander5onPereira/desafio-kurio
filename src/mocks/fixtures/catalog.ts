import type { ArtworkKey, NetworkId } from "@/contracts";
import { NETWORK_IDS } from "@/contracts";
import { createRng } from "../lib/prng";
import { scaleEth } from "../lib/decimal";

/**
 * Catálogo estático (fonte da verdade do conteúdo dos NFTs). Gerado de forma determinística:
 * os 9 primeiros reproduzem a 1ª página do Figma (design/Início-desk.png); o restante é
 * procedural com semente fixa. Só preço/estoque/versão mudam em runtime (DbNftState).
 */
export const COLLECTIONS = [
  { id: "arte-digital", name: "Arte digital" },
  { id: "fotografia", name: "Fotografia" },
  { id: "musica", name: "Música" },
  { id: "arte-3d", name: "Arte 3D" },
  { id: "colecionaveis", name: "Colecionáveis" },
  { id: "generativa", name: "Generativa" },
  { id: "jogos", name: "Jogos" },
  { id: "assinaturas", name: "Assinaturas" },
  { id: "utilidade", name: "Utilidade" },
] as const;

const ARTWORK_ALT: Record<ArtworkKey, string> = {
  golden: "macaco laranja de fones de ouvido verdes diante de um círculo verde",
  emerald: "macaco marrom de óculos escuros e jaqueta verde",
  sage: "gorila cinza de chapéu e moletom roxo",
  ivory: "gorila preto de blazer bege e gola alta verde",
};

const SERIES_BY_ARTWORK: Record<ArtworkKey, string> = {
  golden: "Kurio Beats",
  emerald: "Kurio Apes",
  sage: "Kurio Nomads",
  ivory: "Kurio Barons",
};

export type EditionId = "ed-1-1" | "ed-1-10" | "ed-1-50" | "ed-open";

export const EDITION_ORDER: readonly EditionId[] = ["ed-1-1", "ed-1-10", "ed-1-50", "ed-open"];
const EDITION_DEFS: Record<EditionId, { label: string; supply: number | null; factor: number }> = {
  "ed-1-1": { label: "1/1", supply: 1, factor: 3 },
  "ed-1-10": { label: "1/10", supply: 10, factor: 1.5 },
  "ed-1-50": { label: "1/50", supply: 50, factor: 1 },
  "ed-open": { label: "ABERTA", supply: null, factor: 0.8 },
};

export interface CatalogEdition {
  id: EditionId;
  label: string;
  supply: number | null;
  price: string;
  compareAtPrice: string | null;
  available: number;
}

export interface CatalogNft {
  id: string;
  tokenId: string;
  name: string;
  artwork: ArtworkKey;
  alt: string;
  collectionId: string;
  network: NetworkId;
  rare: boolean;
  createdAt: string;
  isNew: boolean;
  trending: boolean;
  series: string;
  description: string;
  about: string[];
  attributes: string[];
  editions: CatalogEdition[];
  defaultEditionId: EditionId;
  rating: { average: number; count: number };
  contract: { address: string; standard: string; royaltyPercent: number };
  maxPerOrder: number;
}

interface HeroSpec {
  name: string;
  token: number;
  artwork: ArtworkKey;
  price: string;
  compareAt?: string;
  collectionId: string;
  network: NetworkId;
  defaultEdition: EditionId;
  rare: boolean;
  stock: Partial<Record<EditionId, number>>;
  attributes: string[];
  maxPerOrder: number;
}

const HERO_SPECS: HeroSpec[] = [
  { name: "Emerald Ape", token: 42, artwork: "emerald", price: "1.19", collectionId: "arte-digital", network: "ethereum", defaultEdition: "ed-1-50", rare: false, stock: { "ed-1-1": 1, "ed-1-10": 4, "ed-1-50": 50, "ed-open": 150 }, attributes: ["Óculos", "Esmeralda", "Raro"], maxPerOrder: 12 },
  { name: "Sage Nomad", token: 9, artwork: "sage", price: "1.69", collectionId: "fotografia", network: "polygon", defaultEdition: "ed-1-50", rare: false, stock: { "ed-1-10": 6, "ed-1-50": 30, "ed-open": 90 }, attributes: ["Chapéu", "Moletom", "Sereno"], maxPerOrder: 10 },
  { name: "Neon Vessel", token: 552, artwork: "ivory", price: "1.99", compareAt: "2.29", collectionId: "musica", network: "ethereum", defaultEdition: "ed-1-10", rare: true, stock: { "ed-1-1": 1, "ed-1-10": 8, "ed-open": 60 }, attributes: ["Blazer", "Brinco", "Raro"], maxPerOrder: 10 },
  { name: "Cosmic Bloom", token: 118, artwork: "sage", price: "1.29", collectionId: "arte-3d", network: "solana", defaultEdition: "ed-1-50", rare: false, stock: { "ed-1-10": 3, "ed-1-50": 25, "ed-open": 70 }, attributes: ["Chapéu", "Moletom", "Cósmico"], maxPerOrder: 10 },
  { name: "Violet Nomad", token: 314, artwork: "sage", price: "1.39", collectionId: "colecionaveis", network: "polygon", defaultEdition: "ed-1-50", rare: false, stock: { "ed-1-1": 1, "ed-1-10": 5, "ed-1-50": 40, "ed-open": 100 }, attributes: ["Chapéu", "Moletom roxo"], maxPerOrder: 10 },
  { name: "Ivory Baron", token: 88, artwork: "ivory", price: "1.79", collectionId: "generativa", network: "ethereum", defaultEdition: "ed-1-10", rare: false, stock: { "ed-1-1": 1, "ed-1-10": 10, "ed-open": 80 }, attributes: ["Blazer", "Gola alta", "Marfim"], maxPerOrder: 10 },
  { name: "Golden Beat", token: 207, artwork: "golden", price: "0.99", collectionId: "jogos", network: "solana", defaultEdition: "ed-1-50", rare: false, stock: { "ed-1-10": 2, "ed-1-50": 35, "ed-open": 120 }, attributes: ["Fones", "Dourado"], maxPerOrder: 10 },
  { name: "Golden Frequency", token: 71, artwork: "golden", price: "0.59", collectionId: "assinaturas", network: "polygon", defaultEdition: "ed-open", rare: false, stock: { "ed-1-50": 20, "ed-open": 200 }, attributes: ["Fones", "Frequência"], maxPerOrder: 10 },
  { name: "Golden Signal", token: 160, artwork: "golden", price: "0.39", collectionId: "utilidade", network: "ethereum", defaultEdition: "ed-open", rare: false, stock: { "ed-1-50": 15, "ed-open": 250 }, attributes: ["Fones", "Sinal"], maxPerOrder: 10 },
];

const ADJECTIVES = ["Neon", "Cosmic", "Violet", "Ivory", "Golden", "Emerald", "Sage", "Lunar", "Solar", "Amber", "Onyx", "Coral", "Mystic", "Velvet", "Echo", "Nova", "Atlas", "Zen", "Pixel", "Quartz", "Cobalt", "Ember"];
const NOUNS = ["Ape", "Nomad", "Vessel", "Bloom", "Baron", "Beat", "Signal", "Frequency", "Oracle", "Drifter", "Mirage", "Relic", "Pulse", "Totem"];

const pad = (value: number, length: number) => String(value).padStart(length, "0");
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Data-base fixa: o item mais novo é de 2026-07-01 e cada seguinte é 3 h mais antigo. */
const BASE_TIME = Date.UTC(2026, 6, 1, 12, 0, 0);
const HOURS_BETWEEN = 3;
const NEW_COUNT = 20;
export const CATALOG_SIZE = 96;

function buildEditions(
  defaultEdition: EditionId,
  defaultPrice: string,
  defaultCompareAt: string | null,
  stock: Partial<Record<EditionId, number>>,
): CatalogEdition[] {
  const baseFactor = EDITION_DEFS[defaultEdition].factor;
  return EDITION_ORDER.filter((id) => id === defaultEdition || stock[id] !== undefined).map((id) => {
    const def = EDITION_DEFS[id];
    const isDefault = id === defaultEdition;
    return {
      id,
      label: def.label,
      supply: def.supply,
      price: isDefault ? defaultPrice : scaleEth(defaultPrice, def.factor, baseFactor, 2),
      compareAtPrice: isDefault ? defaultCompareAt : null,
      available: stock[id] ?? 0,
    };
  });
}

function aboutText(name: string, editionLabel: string, network: NetworkId): string[] {
  const networkName = network === "ethereum" ? "Ethereum" : network === "polygon" ? "Polygon" : "Solana";
  return [
    `${name} é uma obra digital ${editionLabel} finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na ${networkName}. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
    "A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. Nova Sato recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.",
  ];
}

function buildCatalog(): CatalogNft[] {
  const rng = createRng(0x4b5552);
  const items: CatalogNft[] = [];
  const usedTokens = new Set(HERO_SPECS.map((spec) => spec.token));
  const usedIds = new Set<string>();

  const push = (nft: Omit<CatalogNft, "createdAt" | "isNew" | "trending" | "contract" | "rating"> & Partial<Pick<CatalogNft, "contract" | "rating">>) => {
    const index = items.length;
    const defaultEdition = nft.editions.find((edition) => edition.id === nft.defaultEditionId);
    const editionLabel = defaultEdition?.label ?? "1/50";
    items.push({
      ...nft,
      createdAt: new Date(BASE_TIME - index * HOURS_BETWEEN * 3_600_000).toISOString(),
      isNew: index < NEW_COUNT,
      trending: index % 3 === 0 || rng.next() < 0.1,
      description: nft.description || `Um colecionável digital ${editionLabel} finalizado à mão da coleção Kurio Editions, verificado na rede, com arte desbloqueável e acesso para colecionadores.`,
      contract: nft.contract ?? {
        address: `0x${rng.hex(40)}`,
        standard: nft.network === "solana" ? "Metaplex" : "ERC-721",
        royaltyPercent: rng.int(2, 10),
      },
      rating: nft.rating ?? { average: Math.round((4 + rng.next()) * 10) / 10, count: rng.int(3, 60) },
    });
  };

  for (const spec of HERO_SPECS) {
    const id = `${slugify(spec.name)}-${pad(spec.token, 3)}`;
    usedIds.add(id);
    const editions = buildEditions(spec.defaultEdition, spec.price, spec.compareAt ?? null, spec.stock);
    const name = `${spec.name} #${pad(spec.token, 3)}`;
    const isEmerald = spec.name === "Emerald Ape";
    push({
      id,
      tokenId: pad(spec.token, 4),
      name,
      artwork: spec.artwork,
      alt: `${name}, ${ARTWORK_ALT[spec.artwork]}`,
      collectionId: spec.collectionId,
      network: spec.network,
      rare: spec.rare,
      series: SERIES_BY_ARTWORK[spec.artwork],
      description: isEmerald
        ? "Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na Ethereum, com arte desbloqueável e acesso para colecionadores."
        : "",
      about: isEmerald
        ? [
            "Emerald Ape #042 é uma obra digital 1/50 finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na Ethereum. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.",
            "A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. Nova Sato recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.",
          ]
        : aboutText(name, EDITION_DEFS[spec.defaultEdition].label, spec.network),
      attributes: spec.attributes,
      editions,
      defaultEditionId: spec.defaultEdition,
      maxPerOrder: spec.maxPerOrder,
      ...(isEmerald
        ? {
            rating: { average: 4.8, count: 19 },
            contract: { address: "0x7A42c5E1d3B9f0A2C4e6D8b1F3a5C7e90B2d19E8", standard: "ERC-721", royaltyPercent: 5 },
          }
        : {}),
    });
  }

  while (items.length < CATALOG_SIZE) {
    const artwork = rng.pick(["golden", "emerald", "sage", "ivory"] as const);
    const baseName = `${rng.pick(ADJECTIVES)} ${rng.pick(NOUNS)}`;
    let token = rng.int(1, 999);
    while (usedTokens.has(token)) token = rng.int(1, 999);
    usedTokens.add(token);
    const id = `${slugify(baseName)}-${pad(token, 3)}`;
    if (usedIds.has(id)) continue;
    usedIds.add(id);

    const defaultEdition = rng.pick(["ed-1-10", "ed-1-50", "ed-1-50", "ed-open"] as const);
    const price = (rng.int(5, 450) / 100).toFixed(2);
    const compareAt = rng.next() < 0.15 ? scaleEth(price, 115, 100, 2) : null;
    const soldOut = rng.next() < 0.08;
    const stock: Partial<Record<EditionId, number>> = {
      [defaultEdition]: soldOut ? 0 : rng.int(2, defaultEdition === "ed-open" ? 300 : EDITION_DEFS[defaultEdition].supply ?? 50),
    };
    for (const other of EDITION_ORDER) {
      if (other !== defaultEdition && rng.next() < 0.45) {
        const supply = EDITION_DEFS[other].supply;
        stock[other] = soldOut ? 0 : supply === null ? rng.int(20, 300) : rng.int(0, supply);
      }
    }
    const name = `${baseName} #${pad(token, 3)}`;
    const network = rng.pick(NETWORK_IDS);
    const editions = buildEditions(defaultEdition, price, compareAt, stock);
    push({
      id,
      tokenId: pad(token, 4),
      name,
      artwork,
      alt: `${name}, ${ARTWORK_ALT[artwork]}`,
      collectionId: COLLECTIONS[items.length % COLLECTIONS.length]!.id,
      network,
      rare: rng.next() < 0.12,
      series: SERIES_BY_ARTWORK[artwork],
      description: "",
      about: aboutText(name, EDITION_DEFS[defaultEdition].label, network),
      attributes: [rng.pick(["Chapéu", "Óculos", "Fones", "Blazer", "Moletom", "Brinco"]), rng.pick(["Sereno", "Cósmico", "Dourado", "Neon", "Marfim", "Esmeralda"])],
      editions,
      defaultEditionId: defaultEdition,
      maxPerOrder: 10,
    });
  }

  return items;
}

export const CATALOG: readonly CatalogNft[] = buildCatalog();
export const CATALOG_BY_ID: ReadonlyMap<string, CatalogNft> = new Map(CATALOG.map((nft) => [nft.id, nft]));

export const FIGMA_IDS = {
  emerald: "emerald-ape-042",
  sage: "sage-nomad-009",
  neon: "neon-vessel-552",
  cosmic: "cosmic-bloom-118",
  violet: "violet-nomad-314",
  ivory: "ivory-baron-088",
  goldenBeat: "golden-beat-207",
  goldenFrequency: "golden-frequency-071",
  goldenSignal: "golden-signal-160",
} as const;
