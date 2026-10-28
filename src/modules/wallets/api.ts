import { callEndpoint } from "@/lib/api";
import { endpoints, type WalletInput } from "@/contracts";

export const walletsApi = {
  list: (signal?: AbortSignal) => callEndpoint(endpoints.wallets.list, { signal }),
  create: (body: WalletInput) => callEndpoint(endpoints.wallets.create, { body }),
  update: (walletId: string, body: WalletInput) =>
    callEndpoint(endpoints.wallets.update, { params: { walletId }, body }),
};
