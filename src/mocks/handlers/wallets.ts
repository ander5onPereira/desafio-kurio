import { endpoints } from "@/contracts";
import { connectWallet, createWallet, listWallets, updateWallet } from "../services/wallets";
import { created, noContent, ok, route } from "./route";

export const walletHandlers = (base: string) => [
  route(base, endpoints.wallets.list, ({ requireUser }) => ok({ items: listWallets(requireUser()) })),
  route(base, endpoints.wallets.create, ({ requireUser, body }) => created(createWallet(requireUser(), body))),
  // "connect"/"disconnect" são POST; o PUT /wallets/:walletId não conflita por método.
  route(base, endpoints.wallets.connect, ({ requireUser, body }) =>
    ok(connectWallet(requireUser(), body.provider, body.network, body.walletId)),
  ),
  route(base, endpoints.wallets.disconnect, () => noContent()),
  route(base, endpoints.wallets.update, ({ requireUser, params, body }) =>
    ok(updateWallet(requireUser(), params.walletId, body)),
  ),
];
