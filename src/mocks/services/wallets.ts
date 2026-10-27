import type { ConnectWalletResponse, Wallet, WalletInput, WalletProvider } from "@/contracts";
import { VALID_REFERRAL_CODES } from "../config";
import { getDb, mutate, newId } from "../db/store";
import type { DbUser, DbWallet } from "../db/types";
import { clock } from "../lib/clock";
import { flags } from "../scenarios/runtime";
import { ServerError, notFound, validation } from "./errors";

/** Carteiras do usuário (principal e secundária) e simulação de conexão. */
const toWallet = (record: DbWallet): Wallet => {
  const { userId: _userId, ...wallet } = record;
  return wallet;
};

export function listWallets(user: DbUser): Wallet[] {
  return Object.values(getDb().wallets)
    .filter((wallet) => wallet.userId === user.id)
    .sort((a, b) => (a.role === b.role ? 0 : a.role === "primary" ? -1 : 1))
    .map(toWallet);
}

function validateInput(user: DbUser, input: WalletInput, ignoreId?: string) {
  if (!VALID_REFERRAL_CODES.some((code) => code === input.referralCode.trim().toUpperCase())) {
    throw validation({ referralCode: ["Código de indicação inválido."] });
  }
  const others = Object.values(getDb().wallets).filter((w) => w.userId === user.id && w.id !== ignoreId);
  if (others.some((w) => w.role === input.role)) {
    throw new ServerError(409, "CONFLICT", `Você já tem uma carteira ${input.role === "primary" ? "principal" : "secundária"}.`, {
      fieldErrors: { role: ["Já existe uma carteira com esta função."] },
    });
  }
  if (others.some((w) => w.address.toLowerCase() === input.address.toLowerCase())) {
    throw new ServerError(409, "CONFLICT", "Este endereço já está cadastrado em outra carteira sua.", {
      fieldErrors: { address: ["Este endereço já está cadastrado."] },
    });
  }
}

export function createWallet(user: DbUser, input: WalletInput): Wallet {
  validateInput(user, input);
  return mutate((db) => {
    const now = clock.iso();
    const record: DbWallet = { ...input, secondaryRef: input.secondaryRef ?? null, id: newId("wal"), userId: user.id, createdAt: now, updatedAt: now };
    db.wallets[record.id] = record;
    return toWallet(record);
  });
}

export function updateWallet(user: DbUser, walletId: string, input: WalletInput): Wallet {
  const current = getDb().wallets[walletId];
  if (!current || current.userId !== user.id) throw notFound("Carteira");
  validateInput(user, input, walletId);
  return mutate((db) => {
    const record: DbWallet = { ...current, ...input, secondaryRef: input.secondaryRef ?? null, updatedAt: clock.iso() };
    db.wallets[walletId] = record;
    return toWallet(record);
  });
}

/** Conexão simulada: determinística por provedor/rede; o cenário wallet-rejected a recusa. */
export function connectWallet(user: DbUser, provider: WalletProvider, network: ConnectWalletResponse["network"], walletId?: string): ConnectWalletResponse {
  if (flags().walletRejected) throw new ServerError(422, "WALLET_REJECTED", "A conexão foi recusada na carteira.");
  const wallet = walletId ? getDb().wallets[walletId] : Object.values(getDb().wallets).find((w) => w.userId === user.id && w.role === "primary");
  if (walletId && (!wallet || wallet.userId !== user.id)) throw notFound("Carteira");
  return {
    connected: true,
    provider,
    network,
    address: wallet?.address ?? "0x0000000000000000000000000000000000000000",
    sessionId: `wcs_${provider}_${user.id}`,
  };
}
