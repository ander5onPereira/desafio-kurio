import { useLocation, useNavigate } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import type { NftSummary } from "@/contracts";
import { cn } from "@/lib/utils";
import { AppButton } from "@/components/ui";
import { useAuth } from "@/modules/auth";
import { useIsFavorite, useToggleFavorite } from "./hooks";

export interface FavoriteButtonProps {
  /** Resumo do NFT (um NftDetail também serve). */
  nft: NftSummary;
  /** `icon` = coração redondo (cards, mobile); `button` = botão com texto "Favoritar" (detalhe desktop). */
  variant?: "icon" | "button";
  className?: string;
}

/**
 * FavoriteButton — alterna o favorito com atualização otimista.
 * `aria-pressed` carrega o estado; o rótulo é constante ("Favoritar <nome>").
 * Visitante: leva ao login e volta para a página atual depois de entrar.
 */
export function FavoriteButton({ nft, variant = "icon", className }: FavoriteButtonProps) {
  const { isAuthenticated } = useAuth();
  const isFavorite = useIsFavorite(nft.id);
  const toggle = useToggleFavorite();
  const navigate = useNavigate();
  const href = useLocation({ select: (location) => location.href });

  const onClick = () => {
    if (!isAuthenticated) {
      void navigate({ to: "/login", search: { redirect: href } });
      return;
    }
    toggle.mutate({ nft, favorited: !isFavorite });
  };

  const heart = (
    <Heart
      aria-hidden="true"
      className={cn("size-4 transition-colors", isFavorite && "fill-primary text-primary")}
    />
  );

  if (variant === "button") {
    return (
      <AppButton
        variant="outline"
        aria-pressed={isFavorite}
        aria-label={`Favoritar ${nft.name}`}
        leftIcon={heart}
        onClick={onClick}
        className={className}
      >
        Favoritar
      </AppButton>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={isFavorite}
      aria-label={`Favoritar ${nft.name}`}
      onClick={onClick}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-md bg-card/90 text-foreground transition-colors hover:bg-border",
        className,
      )}
    >
      {heart}
    </button>
  );
}
