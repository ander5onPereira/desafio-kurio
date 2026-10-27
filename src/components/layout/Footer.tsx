import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { AppButton, AppComingSoon } from "@/components/ui";
import { announce } from "@/components/shared/AppLiveRegion";
import { FacebookIcon, InstagramIcon, LinkedinIcon, TwitterIcon, YoutubeIcon } from "@/components/shared/BrandIcons";
import { Container } from "./Container";
import { Logo } from "./Logo";

const BENEFITS = [
  { letter: "W", title: "Segurança da carteira", text: "Proteja sua carteira e colecione arte digital verificada com confiança." },
  { letter: "C", title: "Criadores em destaque", text: "Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede." },
  { letter: "D", title: "Alertas de lançamentos", text: "Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado." },
] as const;

const HELP_LINKS = ["Central de ajuda", "Como comprar NFTs", "Carteira e segurança", "Política do mercado", "Denunciar item"] as const;
const COLLECTION_LINKS = ["Arte digital", "Fotografia", "Música", "Arte 3D", "Utilidade"] as const;
const PROFILE_SOON = ["Minha coleção", "Atividade", "Estúdio do criador"] as const;

const SOCIAL = [
  { name: "Facebook", Icon: FacebookIcon },
  { name: "Instagram", Icon: InstagramIcon },
  { name: "Twitter", Icon: TwitterIcon },
  { name: "LinkedIn", Icon: LinkedinIcon },
  { name: "YouTube", Icon: YoutubeIcon },
] as const;

const linkClass = "rounded-xs text-sm text-foreground transition-colors hover:text-accent-foreground";
const headingClass = "text-lg font-bold text-foreground";

/** Newsletter: a inscrição está FORA DE ESCOPO, então o envio informa isso (nunca aparenta sucesso). */
function Newsletter() {
  const [notice, setNotice] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const message = "A inscrição por e-mail ainda não está disponível nesta demonstração.";
    setNotice(message);
    announce(message);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <h2 className="text-lg font-bold leading-tight text-foreground">Antecipe-se ao próximo lançamento</h2>
      <div className="flex">
        <label htmlFor="newsletter-email" className="sr-only">
          Seu e-mail para receber lançamentos
        </label>
        <input
          id="newsletter-email"
          type="email"
          autoComplete="email"
          placeholder="digite seu e-mail..."
          className="h-10 min-w-0 flex-1 rounded-l-sm bg-strip px-3 text-sm text-foreground placeholder:text-subtle-foreground"
        />
        <AppButton type="submit" className="rounded-l-none">
          Enviar
        </AppButton>
      </div>
      <p className="text-xs text-muted-foreground">Receba lançamentos selecionados, histórias de criadores e novidades do mercado.</p>
      {notice && (
        <p role="status" className="text-xs text-warning">
          {notice}
        </p>
      )}
    </form>
  );
}

/**
 * Footer (desktop, ≥ md) — três faixas como no Figma: benefícios + newsletter, faixa marrom com
 * contato e links. Links fora de escopo usam AppComingSoon (desabilitados, "em breve").
 */
export function Footer() {
  return (
    <footer className="mt-24 hidden md:block">
      <Container>
        <div className="grid grid-cols-4 gap-0 bg-card px-12 py-8">
          {BENEFITS.map((benefit) => (
            <section key={benefit.title} className="flex flex-col gap-3 border-r border-primary/70 px-6 first:pl-0">
              <span
                aria-hidden="true"
                className="flex size-18 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground"
              >
                {benefit.letter}
              </span>
              <h2 className="text-lg font-bold text-foreground">{benefit.title}</h2>
              <p className="text-sm text-muted-foreground">{benefit.text}</p>
            </section>
          ))}
          <div className="pl-6">
            <Newsletter />
          </div>
        </div>

        <div className="grid grid-cols-4 items-center bg-strip px-8 py-6 text-sm text-foreground">
          <Logo className="px-0" />
          <p>Feito para colecionadores, criadores e cultura</p>
          <p>contato@email.com</p>
          <p>+55 11 4002 8922</p>
        </div>

        <div className="grid grid-cols-4 gap-6 bg-card px-8 py-10">
          <nav aria-label="Meu perfil" className="flex flex-col gap-3">
            <h2 className={headingClass}>Meu perfil</h2>
            <Link to="/perfil" className={linkClass}>
              Meu perfil
            </Link>
            {PROFILE_SOON.map((label) => (
              <AppComingSoon key={label} className="text-sm text-foreground">
                {label}
              </AppComingSoon>
            ))}
            <Link to="/perfil/favoritos" className={linkClass}>
              Lista de interesse
            </Link>
          </nav>

          <nav aria-label="Central de ajuda" className="flex flex-col gap-3">
            <h2 className={headingClass}>Central de ajuda</h2>
            {HELP_LINKS.map((label) => (
              <AppComingSoon key={label} className="text-sm text-foreground">
                {label}
              </AppComingSoon>
            ))}
          </nav>

          <nav aria-label="Coleções" className="flex flex-col gap-3">
            <h2 className={headingClass}>Coleções</h2>
            {COLLECTION_LINKS.map((label) => (
              <AppComingSoon key={label} className="text-sm text-foreground">
                {label}
              </AppComingSoon>
            ))}
          </nav>

          <div className="flex flex-col gap-3">
            <h2 className={headingClass}>Redes sociais</h2>
            <ul className="flex gap-2">
              {SOCIAL.map(({ name, Icon }) => (
                <li key={name}>
                  <AppComingSoon className="size-8 justify-center rounded-xs border border-primary text-accent-foreground">
                    <Icon className="size-4" />
                    <span className="sr-only">{name}</span>
                  </AppComingSoon>
                </li>
              ))}
            </ul>
            <h2 className={`${headingClass} mt-4`}>Carteiras compatíveis</h2>
            <p className="inline-block w-fit rounded-xs border border-primary/60 bg-strip px-3 py-1.5 text-[0.625rem] font-bold uppercase tracking-wide text-accent-foreground">
              MetaMask · WalletConnect · Coinbase
            </p>
          </div>
        </div>

        <p className="py-6 text-center text-sm text-foreground">© 2026 Kurio. Propriedade digital para todos.</p>
      </Container>
    </footer>
  );
}
