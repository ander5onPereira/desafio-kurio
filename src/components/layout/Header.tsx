import { Link, useRouterState } from "@tanstack/react-router";
import { LogIn, Search } from "lucide-react";
import { AppButton, AppComingSoon, AppSkeleton } from "@/components/ui";
import { useAuth } from "@/modules/auth";
import { AccountMenu } from "./AccountMenu";
import { CartLink } from "./CartLink";
import { Container } from "./Container";
import { Logo } from "./Logo";
import { loginLinkProps } from "./authLinks";
import { isInicioActive, isMercadoActive } from "./chrome";
import { NavLink } from "./NavLink";
import { searchDialog } from "./searchDialogStore";

const navItemClass =
  "relative flex h-full items-center px-1 text-sm text-foreground transition-colors hover:text-accent-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-primary after:opacity-0 aria-[current=page]:font-semibold aria-[current=page]:text-accent-foreground aria-[current=page]:after:opacity-100";

/**
 * Header (desktop, ≥ md). No mobile cada página tem a própria barra (MobileTopBar/MobileSearchBar)
 * e a navegação fica no BottomNav. Grid de 3 colunas mantém o menu centralizado como no Figma.
 */
export function Header() {
  const { status, isAuthenticated } = useAuth();
  const { pathname, href } = useRouterState({
    select: (state) => ({ pathname: state.location.pathname, href: state.location.href }),
  });

  return (
    <header className="hidden border-b border-border md:block">
      <Container className="grid h-17 grid-cols-[1fr_auto_1fr] items-center">
        <Logo />

        <nav aria-label="Principal" className="flex h-full items-center gap-5 lg:gap-10">
          <NavLink to="/" active={isInicioActive(pathname)} className={navItemClass}>
            Início
          </NavLink>
          <NavLink to="/" hash="catalogo" active={isMercadoActive(pathname)} className={navItemClass}>
            Mercado
          </NavLink>
          <AppComingSoon className="h-full px-1 text-sm text-foreground">Criadores</AppComingSoon>
          <AppComingSoon className="h-full px-1 text-sm text-foreground">Aprenda</AppComingSoon>
        </nav>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            aria-label="Buscar NFTs"
            onClick={searchDialog.open}
            className="inline-flex size-9 items-center justify-center rounded-sm text-foreground transition-colors hover:text-accent-foreground"
          >
            <Search className="size-5" aria-hidden="true" />
          </button>
          <CartLink />
          {status === "loading" ? (
            <AppSkeleton className="h-9 w-24" />
          ) : isAuthenticated ? (
            <AccountMenu />
          ) : (
            <AppButton asChild size="md" className="h-9">
              <Link {...loginLinkProps(href)}>
                <LogIn className="size-4" aria-hidden="true" />
                Entrar
              </Link>
            </AppButton>
          )}
        </div>
      </Container>
    </header>
  );
}
