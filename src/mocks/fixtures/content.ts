import type { HeroSlide, NftReviewsResponse } from "@/contracts";
import { createRng } from "../lib/prng";
import { hashString } from "../lib/hash";
import { CATALOG_BY_ID, FIGMA_IDS } from "./catalog";

export function buildHeroSlides(): HeroSlide[] {
  const alt = (id: string) => {
    const nft = CATALOG_BY_ID.get(id);
    if (!nft) throw new Error(`NFT de fixture ausente: ${id}`);
    return { key: nft.artwork, alt: nft.alt };
  };
  return [
    {
      id: "hero-1",
      eyebrow: "Bem-vindo à Kurio",
      title: "Seja dono do futuro da arte digital",
      description:
        "Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.",
      ctaLabel: "Explorar",
      images: [alt(FIGMA_IDS.emerald), alt(FIGMA_IDS.sage)],
      nftId: FIGMA_IDS.emerald,
    },
    {
      id: "hero-2",
      eyebrow: "Lançamentos gênesis",
      title: "Edições limitadas direto dos criadores",
      description:
        "Colecione edições escassas diretamente dos criadores antes da revelação pública e garanta o seu lugar na história de cada coleção.",
      ctaLabel: "Explorar",
      images: [alt(FIGMA_IDS.neon), alt(FIGMA_IDS.goldenBeat)],
      nftId: FIGMA_IDS.neon,
    },
    {
      id: "hero-3",
      eyebrow: "Arte selecionada",
      title: "Obras que definem a cultura digital",
      description:
        "Explore novos artistas, coleções verificadas e obras digitais que definem a cultura digital — tudo com procedência registrada na rede.",
      ctaLabel: "Explorar",
      images: [alt(FIGMA_IDS.ivory), alt(FIGMA_IDS.cosmic)],
      nftId: FIGMA_IDS.ivory,
    },
  ];
}

const AUTHORS = ["Marina Lopes", "Caio Ribeiro", "Helena Duarte", "Pedro Santana", "Luiza Carvalho", "Rafael Amaral", "Beatriz Nogueira", "Tiago Moreira", "Sofia Azevedo", "Diego Fontes"];
const COMMENTS = [
  "Arte impecável e procedência bem documentada. Recomendo.",
  "A transferência para a carteira foi rápida e sem surpresas.",
  "Detalhes incríveis na versão em alta resolução.",
  "Edição limitada que realmente valoriza a coleção.",
  "Entrega dos extras exclusivos para colecionadores superou o esperado.",
  "Ótimo custo-benefício dentro da série.",
  "Visual marcante, combina com o restante da minha coleção.",
  "Gostei do acabamento e da clareza dos metadados.",
];

export function buildReviews(nftId: string, average: number, count: number): NftReviewsResponse {
  const rng = createRng(parseInt(hashString(nftId).slice(0, 8), 16));
  const total = Math.min(10, count);
  const base = Date.UTC(2026, 5, 20, 12, 0, 0);
  const items = Array.from({ length: total }, (_, index) => {
    const stars = Math.max(1, Math.min(5, Math.round(average + (rng.next() - 0.5) * 1.4)));
    return {
      id: `rev_${nftId}_${index + 1}`,
      author: AUTHORS[(index + rng.int(0, 3)) % AUTHORS.length]!,
      rating: stars,
      comment: COMMENTS[(index + rng.int(0, 3)) % COMMENTS.length]!,
      createdAt: new Date(base - index * 36 * 3_600_000).toISOString(),
    };
  });
  return { items, average, count };
}
