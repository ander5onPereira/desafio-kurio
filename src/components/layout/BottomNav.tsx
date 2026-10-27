import { useRouterState, type LinkProps } from "@tanstack/react-router";
import { Heart, House, ScanSearch, ShoppingCart, User, type LucideIcon } from "lucide-react";
import { AppBadge } from "@/components/ui";
import { useCartCount } from "@/modules/cart";
import { cn } from "@/lib/utils";
import { NavLink } from "./NavLink";
import { searchDialog } from "./searchDialogStore";

interface NavItem {
  to: LinkProps["to"];
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
  showCount?: boolean;
}

const LEFT: NavItem[] = [
  { to: "/", label: "Início", icon: House, isActive: (p) => p === "/" },
  { to: "/perfil/favoritos", label: "Favoritos", icon: Heart, isActive: (p) => p.startsWith("/perfil/favoritos") },
];
const RIGHT: NavItem[] = [
  { to: "/carrinho", label: "Carrinho", icon: ShoppingCart, isActive: (p) => p.startsWith("/carrinho"), showCount: true },
  { to: "/perfil", label: "Perfil", icon: User, isActive: (p) => p.startsWith("/perfil") && !p.startsWith("/perfil/favoritos") },
];

/**
 * BottomNav (mobile, < md) — barra inferior curva do Figma com o botão central de busca.
 * Ícones sem texto visível: o nome acessível vem do `aria-label`; a página atual usa `aria-current`.
 */
export function BottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const count = useCartCount();

  const renderItem = (item: NavItem) => {
    const active = item.isActive(pathname);
    const Icon = item.icon;
    const label = item.showCount ? `${item.label}, ${count} ${count === 1 ? "item" : "itens"}` : item.label;
    return (
      <NavLink
        key={item.label}
        to={item.to}
        active={active}
        aria-label={label}
        className={cn(
          "relative mx-auto inline-flex size-11 items-center justify-center rounded-full transition-colors",
          active ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Icon className="size-6" aria-hidden="true" fill={active && item.icon === Heart ? "currentColor" : "none"} />
        {item.showCount && count > 0 && (
          <AppBadge variant="count" aria-hidden="true" className="absolute right-0.5 top-0.5">
            {count > 99 ? "99+" : count}
          </AppBadge>
        )}
      </NavLink>
    );
  };

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="relative grid h-20 grid-cols-5 items-center px-2">
        {LEFT.map(renderItem)}
        <div aria-hidden="true" />
        {RIGHT.map(renderItem)}
        <button
          type="button"
          aria-label="Buscar NFTs"
          onClick={searchDialog.open}
          className="absolute left-1/2 top-0 inline-flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[6px] border-background bg-primary text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-pressed"
        >
          <ScanSearch className="size-7" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
