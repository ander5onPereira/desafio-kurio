import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { AppButton, AppEmpty, AppError } from "@/components/ui";
import { useFavorites } from "@/modules/favorites";
import { NftGrid, NftGridSkeleton } from "@/modules/nfts/components/NftGrid";

export const Route = createFileRoute("/_auth/perfil/favoritos")({
  head: () => ({ meta: [{ title: "Lista de interesse · Kurio" }] }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const favorites = useFavorites();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-base font-bold text-foreground">Lista de interesse</h1>

      {favorites.isError ? (
        <AppError error={favorites.error} onRetry={() => void favorites.refetch()} isRetrying={favorites.isRefetching} />
      ) : !favorites.data ? (
        <NftGridSkeleton count={6} label="Carregando sua lista de interesse" />
      ) : favorites.data.items.length === 0 ? (
        <AppEmpty
          icon={<Heart className="size-10" />}
          title="Sua lista de interesse está vazia"
          description="Toque no coração de um NFT para guardá-lo aqui e acompanhar o preço."
          action={
            <AppButton asChild>
              <Link to="/" hash="catalogo">
                Explorar o mercado
              </Link>
            </AppButton>
          }
        />
      ) : (
        <NftGrid items={favorites.data.items} label="NFTs favoritos" />
      )}
    </div>
  );
}
