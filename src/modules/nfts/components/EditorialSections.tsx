import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { Artwork } from "@/contracts";
import { AppButton, AppComingSoon } from "@/components/ui";
import { AppArtwork } from "@/components/shared";

/*
  Conteúdo editorial ESTÁTICO do Início (copy do Figma). Não vem da API: são peças de marketing.
  "Ler mais" e as páginas editoriais estão fora de escopo → ficam como "Em breve", sem fingir sucesso.
*/

interface Promo {
  title: string;
  description: string;
  artwork: Artwork;
  to: { tab?: "new"; collection?: string[] };
}

const PROMOS: readonly Promo[] = [
  {
    title: "Lançamentos gênesis de edição limitada",
    description: "Colecione edições escassas diretamente dos criadores antes da revelação pública.",
    artwork: { key: "emerald", alt: "Macaco de óculos escuros e jaqueta verde, arte de lançamento gênesis" },
    to: { tab: "new" },
  },
  {
    title: "Arte digital selecionada e muito mais",
    description: "Explore novos artistas, coleções verificadas e obras digitais que definem a cultura da internet.",
    artwork: { key: "ivory", alt: "Gorila de blazer bege e gola verde, arte de coleção selecionada" },
    to: { collection: ["arte-digital"] },
  },
];

export function PromoBanners() {
  return (
    <section aria-label="Destaques promocionais" className="grid gap-6 md:grid-cols-2">
      {PROMOS.map((promo) => (
        <article key={promo.title} className="flex overflow-hidden rounded-md bg-card">
          <AppArtwork artwork={promo.artwork} decorative className="hidden size-40 shrink-0 object-cover sm:block md:size-56" />
          <div className="flex flex-1 flex-col items-start justify-center gap-3 p-5 md:items-end md:text-right">
            <h2 className="text-base font-bold text-foreground">{promo.title}</h2>
            <p className="text-xs leading-5 text-muted-foreground">{promo.description}</p>
            <AppButton asChild size="sm" rightIcon={<ArrowRight className="size-4" aria-hidden="true" />}>
              <Link to="/" search={promo.to} hash="catalogo">
                Explorar
              </Link>
            </AppButton>
          </div>
        </article>
      ))}
    </section>
  );
}

interface Article {
  date: string;
  reading: string;
  title: string;
  excerpt: string;
  artwork: Artwork;
}

const ARTICLES: readonly Article[] = [
  {
    date: "12 de setembro",
    reading: "Leitura de 6 min",
    title: "Como funciona a propriedade de NFTs",
    excerpt: "Aprenda a colecionar, negociar e verificar arte digital.",
    artwork: { key: "emerald", alt: "" },
  },
  {
    date: "13 de setembro",
    reading: "Leitura de 2 min",
    title: "10 artistas digitais para acompanhar",
    excerpt: "Conheça criadores que moldam a cultura digital.",
    artwork: { key: "ivory", alt: "" },
  },
  {
    date: "15 de setembro",
    reading: "Leitura de 3 min",
    title: "Raridade, atributos e procedência",
    excerpt: "Entenda raridade, procedência, direitos autorais e utilidade.",
    artwork: { key: "sage", alt: "" },
  },
  {
    date: "15 de setembro",
    reading: "Leitura de 2 min",
    title: "Como proteger sua carteira",
    excerpt: "Proteja sua carteira, seus ativos e sua identidade.",
    artwork: { key: "golden", alt: "" },
  },
];

/** "Diário da Cunhagem": 4 artigos de exemplo (editorial fora de escopo → "Ler mais" = "Em breve"). */
export function JournalSection() {
  return (
    <section aria-labelledby="journal-title" className="flex flex-col items-center gap-3">
      <h2 id="journal-title" className="text-2xl font-bold text-foreground">
        Diário da Cunhagem
      </h2>
      <p className="max-w-xl text-center text-xs text-muted-foreground">
        Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
      </p>
      <ul className="mt-6 grid w-full grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
        {ARTICLES.map((article) => (
          <li key={article.title}>
            <article className="flex h-full flex-col overflow-hidden rounded-md bg-card">
              <AppArtwork artwork={article.artwork} decorative className="aspect-square w-full object-cover lg:aspect-[4/3]" />
              <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="text-[0.625rem] text-subtle-foreground">
                  {article.date} <span aria-hidden="true">|</span> {article.reading}
                </p>
                <h3 className="text-sm font-bold text-foreground">{article.title}</h3>
                <p className="text-xs leading-5 text-muted-foreground">{article.excerpt}</p>
                <AppComingSoon className="mt-auto pt-2 text-xs font-bold text-accent-foreground">Ler mais →</AppComingSoon>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
