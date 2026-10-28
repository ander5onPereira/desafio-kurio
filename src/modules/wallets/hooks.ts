import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Wallet, WalletInput, WalletsResponse } from "@/contracts";
import type { ApiError } from "@/lib/errors";
import { keys, scopeOf } from "@/lib/queryKeys";
import { useAuth } from "@/modules/auth";
import { walletsApi } from "./api";

function useWalletsScope() {
  const { user } = useAuth();
  return { userId: user?.id ?? null, scope: scopeOf(user?.id) };
}

/**
 * Carteiras do usuário (principal e secundária). API pública usada também pelo checkout (Agente D).
 * Só consulta autenticado; 5 min de frescor (muda pouco e só por ação do próprio usuário).
 */
export function useWallets() {
  const { userId, scope } = useWalletsScope();
  return useQuery<WalletsResponse, ApiError>({
    queryKey: keys.wallets(scope),
    queryFn: ({ signal }) => walletsApi.list(signal),
    enabled: userId !== null,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}

function upsertWallet(current: WalletsResponse | undefined, wallet: Wallet): WalletsResponse {
  const items = current?.items ?? [];
  const exists = items.some((item) => item.id === wallet.id);
  return { items: exists ? items.map((item) => (item.id === wallet.id ? wallet : item)) : [...items, wallet] };
}

export function useCreateWallet() {
  const queryClient = useQueryClient();
  const { scope } = useWalletsScope();
  return useMutation<Wallet, ApiError, WalletInput>({
    mutationFn: (input) => walletsApi.create(input),
    onSuccess: (wallet) => {
      queryClient.setQueryData<WalletsResponse>(keys.wallets(scope), (current) => upsertWallet(current, wallet));
      void queryClient.invalidateQueries({ queryKey: keys.wallets(scope) });
    },
  });
}

export function useUpdateWallet() {
  const queryClient = useQueryClient();
  const { scope } = useWalletsScope();
  return useMutation<Wallet, ApiError, { walletId: string; input: WalletInput }>({
    mutationFn: ({ walletId, input }) => walletsApi.update(walletId, input),
    onSuccess: (wallet) => {
      queryClient.setQueryData<WalletsResponse>(keys.wallets(scope), (current) => upsertWallet(current, wallet));
      void queryClient.invalidateQueries({ queryKey: keys.wallets(scope) });
    },
  });
}
