import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { Download, Heart, LogOut, MapPin, ShoppingCart, Tag, TriangleAlert, User } from "lucide-react";
import type { ReactNode } from "react";
import { Container } from "@/components/layout/Container";
import { AppComingSoon } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useAuth } from "@/modules/auth";

const itemClasses =
  "flex h-11 w-full items-center gap-3 border-l-4 border-transparent px-4 text-sm text-accent-foreground transition-colors hover:bg-background/40 aria-[current=page]:border-primary aria-[current=page]:bg-background/50";

/** Itens fora de escopo (README §3): visíveis, mas desabilitados e sem aparência de sucesso. */
const COMING_SOON: ReadonlyArray<{ label: string; icon: ReactNode }> = [
  { label: "Atividade", icon: <ShoppingCart className="size-[1.125rem]" aria-hidden="true" /> },
  { label: "Ofertas", icon: <Tag className="size-[1.125rem]" aria-hidden="true" /> },
  { label: "Arquivos baixados", icon: <Download className="size-[1.125rem]" aria-hidden="true" /> },
  { label: "Suporte", icon: <TriangleAlert className="size-[1.125rem]" aria-hidden="true" /> },
];

/**
 * AccountLayout — moldura de "Meu perfil": sidebar no desktop (≥ lg) e faixa horizontal rolável no
 * tablet/mobile (não há frame mobile no Figma: mesmo padrão visual, mesma navegação).
 * O mesmo <nav> atende os dois (CSS decide o layout), então a semântica é única.
 */
export function AccountLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    await navigate({ to: "/" });
  }

  return (
    <Container className="py-6 lg:grid lg:grid-cols-[19.375rem_minmax(0,1fr)] lg:items-start lg:gap-7 lg:py-8">
      <nav aria-label="Meu perfil" className="rounded-md bg-card">
        <h2 className="px-4 pb-1 pt-4 text-lg font-bold text-foreground">Meu perfil</h2>
        {/* `relative`: o texto sr-only (absoluto) dos itens "em breve" precisa ser recortado pelo overflow da faixa, senão alarga a página. */}
        <ul className="relative flex overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          <li className="shrink-0 lg:shrink">
            <Link to="/perfil" activeOptions={{ exact: true }} className={itemClasses}>
              <User className="size-[1.125rem]" aria-hidden="true" />
              Dados do perfil
            </Link>
          </li>
          <li className="shrink-0 lg:shrink">
            <Link to="/perfil/carteiras" className={itemClasses}>
              <MapPin className="size-[1.125rem]" aria-hidden="true" />
              Carteiras
            </Link>
          </li>
          {/* "Lista de interesse" = favoritos do usuário. */}
          <li className="shrink-0 lg:shrink">
            <Link to="/perfil/favoritos" className={itemClasses}>
              <Heart className="size-[1.125rem]" aria-hidden="true" />
              Lista de interesse
            </Link>
          </li>
          {COMING_SOON.map((item) => (
            <li key={item.label} className="shrink-0 lg:shrink">
              <AppComingSoon badge className={cn(itemClasses, "cursor-not-allowed hover:bg-transparent")}>
                {item.icon}
                {item.label}
              </AppComingSoon>
            </li>
          ))}
          <li className="shrink-0 border-t border-border lg:mt-1 lg:shrink">
            <button type="button" onClick={handleLogout} className={cn(itemClasses, "font-bold")}>
              <LogOut className="size-[1.125rem]" aria-hidden="true" />
              Sair
            </button>
          </li>
        </ul>
      </nav>

      <div className="min-w-0 pt-6 lg:pt-0">
        <Outlet />
      </div>
    </Container>
  );
}
