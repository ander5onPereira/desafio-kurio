import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { AppBadge } from "@/components/ui";
import { useCartCount } from "@/modules/cart";
import { cn } from "@/lib/utils";

/**
 * CartLink — ícone do carrinho com a bolinha da quantidade TOTAL de unidades.
 * O rótulo acessível traz o número ("Carrinho, 6 itens"); a bolinha é decorativa.
 */
export function CartLink({ className }: { className?: string }) {
  const count = useCartCount();
  return (
    <Link
      to="/carrinho"
      aria-label={`Carrinho, ${count} ${count === 1 ? "item" : "itens"}`}
      className={cn("relative inline-flex size-9 items-center justify-center rounded-sm text-foreground transition-colors hover:text-accent-foreground", className)}
    >
      <ShoppingCart className="size-5" aria-hidden="true" />
      {count > 0 && (
        <AppBadge variant="count" aria-hidden="true" className="absolute -right-0.5 -top-0.5">
          {count > 99 ? "99+" : count}
        </AppBadge>
      )}
    </Link>
  );
}
