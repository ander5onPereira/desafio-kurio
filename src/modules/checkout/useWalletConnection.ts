import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { endpoints, type NetworkId, type WalletProvider } from "@/contracts";
import { callEndpoint } from "@/lib/api";
import type { ApiError } from "@/lib/errors";

/**
 * Conexão SIMULADA com a carteira (nenhuma extensão real). Estados:
 *   idle → connecting → connected | rejected;  connected → disconnected.
 * A recusa vem do servidor simulado (422 WALLET_REJECTED) — cenário `wallet-rejected`.
 * Trocar carteira, provedor ou rede invalida a conexão (volta a `idle`): é preciso reconectar.
 */
export type WalletConnectionStatus = "idle" | "connecting" | "connected" | "rejected" | "disconnected";

interface Selection {
  walletId: string | null;
  provider: WalletProvider | null;
  network: NetworkId | null;
}

interface InternalState {
  status: WalletConnectionStatus;
  /** Chave da seleção para a qual o estado vale. */
  key: string | null;
  message: string | null;
}

const selectionKey = ({ walletId, provider, network }: Selection) =>
  walletId && provider && network ? `${walletId}:${provider}:${network}` : null;

export function useWalletConnection(selection: Selection) {
  const key = selectionKey(selection);
  const [state, setState] = useState<InternalState>({ status: "idle", key: null, message: null });

  const connectMutation = useMutation<unknown, ApiError>({
    mutationFn: () => {
      if (!selection.provider || !selection.network) throw new Error("Selecione carteira e provedor");
      return callEndpoint(endpoints.wallets.connect, {
        body: { provider: selection.provider, network: selection.network, walletId: selection.walletId ?? undefined },
      });
    },
    onMutate: () => setState({ status: "connecting", key, message: null }),
    onSuccess: () => setState({ status: "connected", key, message: null }),
    onError: (error) =>
      setState({
        status: "rejected",
        key,
        message: error.code === "WALLET_REJECTED" ? "A conexão foi recusada na carteira. Tente novamente." : error.message,
      }),
  });

  const disconnectMutation = useMutation<unknown, ApiError>({
    mutationFn: () => callEndpoint(endpoints.wallets.disconnect, {}),
    onSuccess: () => setState({ status: "disconnected", key, message: null }),
    onError: (error) => setState((current) => ({ ...current, message: error.message })),
  });

  // Estado de uma seleção antiga não vale para a atual.
  const effectiveStatus: WalletConnectionStatus = state.key === key ? state.status : "idle";

  return {
    status: effectiveStatus,
    message: state.key === key ? state.message : null,
    isConnected: effectiveStatus === "connected",
    isBusy: connectMutation.isPending || disconnectMutation.isPending,
    canConnect: key !== null,
    connect: () => connectMutation.mutate(),
    disconnect: () => disconnectMutation.mutate(),
  };
}
