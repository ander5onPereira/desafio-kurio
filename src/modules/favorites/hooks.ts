import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { endpoints, type FavoritesResponse, type NftSummary } from "@/contracts";
import { callEndpoint } from "@/lib/api";
import { toApiError, type ApiError } from "@/lib/errors";
import { keys, scopeOf } from "@/lib/queryKeys";
import { announce } from "@/components/shared";
import { authStore, useAuth } from "@/modules/auth";

/** Favoritos do usuário autenticado (cache isolado por usuário via `keys.favorites(scope)`). */
export function useFavorites() {
  const { user, isAuthenticated } = useAuth();
  return useQuery<FavoritesResponse, ApiError>({
    queryKey: keys.favorites(scopeOf(user?.id)),
    queryFn: ({ signal }) => callEndpoint(endpoints.favorites.list, { signal }),
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}

/** true se o NFT está nos favoritos (false para visitante). */
export function useIsFavorite(nftId: string): boolean {
  const { user, isAuthenticated } = useAuth();
  const { data } = useQuery<FavoritesResponse, ApiError, boolean>({
    queryKey: keys.favorites(scopeOf(user?.id)),
    queryFn: ({ signal }) => callEndpoint(endpoints.favorites.list, { signal }),
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    select: (response) => response.items.some((item) => item.id === nftId),
  });
  return data ?? false;
}

interface ToggleVariables {
  /** NFT afetado. O resumo completo permite inserir o item na lista de forma otimista. */
  nft: NftSummary;
  /** Estado ALVO: true = favoritar, false = remover. */
  favorited: boolean;
}

interface ToggleContext {
  scope: string;
  previous: FavoritesResponse | undefined;
}

/**
 * Favoritar/desfavoritar com atualização OTIMISTA:
 * cancela consultas em andamento → guarda o estado anterior → aplica o patch no cache →
 * em erro faz ROLLBACK e avisa (toast + região ao vivo) → ao final revalida com o servidor.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation<unknown, ApiError, ToggleVariables, ToggleContext>({
    mutationFn: async ({ nft, favorited }) => {
      try {
        return favorited
          ? await callEndpoint(endpoints.favorites.add, { params: { nftId: nft.id } })
          : await callEndpoint(endpoints.favorites.remove, { params: { nftId: nft.id } });
      } catch (error) {
        throw toApiError(error);
      }
    },
    onMutate: async ({ nft, favorited }) => {
      const scope = scopeOf(authStore.getSnapshot().user?.id);
      const queryKey = keys.favorites(scope);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<FavoritesResponse>(queryKey);
      queryClient.setQueryData<FavoritesResponse>(queryKey, (current) => {
        const items = current?.items ?? [];
        const without = items.filter((item) => item.id !== nft.id);
        return { items: favorited ? [nft, ...without] : without };
      });
      return { scope, previous };
    },
    onError: (error, { nft, favorited }, context) => {
      if (context) {
        // Se não havia cache antes, remove o patch otimista; senão restaura o snapshot.
        if (context.previous) queryClient.setQueryData(keys.favorites(context.scope), context.previous);
        else queryClient.removeQueries({ queryKey: keys.favorites(context.scope), exact: true });
      }
      const message = favorited
        ? `Não foi possível favoritar ${nft.name}.`
        : `Não foi possível remover ${nft.name} dos favoritos.`;
      toast.error(message, { description: error.message });
      announce(`${message} A alteração foi desfeita.`, "assertive");
    },
    onSuccess: (_data, { nft, favorited }) => {
      announce(favorited ? `${nft.name} adicionado aos favoritos.` : `${nft.name} removido dos favoritos.`);
    },
    onSettled: (_data, _error, _variables, context) => {
      const scope = context?.scope ?? scopeOf(authStore.getSnapshot().user?.id);
      void queryClient.invalidateQueries({ queryKey: keys.favorites(scope) });
    },
  });
}
