import { z } from "zod";
import { idSchema, isoDate, networkId, walletProvider, type NetworkId } from "./common";

export const WALLET_ROLES = ["primary", "secondary"] as const;
export const walletRole = z.enum(WALLET_ROLES);
export type WalletRole = z.infer<typeof walletRole>;

/** Endereço válido para a rede: 0x + 40 hex (Ethereum/Polygon) ou base58 de 32–44 chars (Solana). */
export function isValidAddress(network: NetworkId, address: string): boolean {
  if (network === "solana") return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export const walletFieldsSchema = z.object({
  role: walletRole,
  displayName: z.string().trim().min(2, "Informe o nome de exibição").max(40),
  nickname: z.string().trim().min(2, "Informe o apelido da carteira").max(24),
  network: networkId,
  profileName: z.string().trim().min(2, "Informe o nome do perfil").max(40),
  address: z.string().trim().min(1, "Informe o endereço da carteira"),
  secondaryRef: z.string().trim().max(80).nullable().optional(),
  walletType: walletProvider,
  referralCode: z.string().trim().min(4, "Informe o código de indicação").max(24),
  email: z.email("E-mail inválido"),
  ensName: z.string().trim().min(3, "Informe o nome ENS").max(60),
});

export const walletInputSchema = walletFieldsSchema.superRefine((value, ctx) => {
  if (!isValidAddress(value.network, value.address)) {
    ctx.addIssue({
      code: "custom",
      path: ["address"],
      message: "Endereço inválido para a rede selecionada",
    });
  }
});
export type WalletInput = z.infer<typeof walletInputSchema>;

export const walletSchema = walletFieldsSchema.extend({
  id: idSchema,
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type Wallet = z.infer<typeof walletSchema>;

export const walletsResponseSchema = z.object({ items: z.array(walletSchema) });
export type WalletsResponse = z.infer<typeof walletsResponseSchema>;

/** Simulação de conexão (sem extensão real). Recusa = 422 WALLET_REJECTED. */
export const connectWalletBodySchema = z.object({
  provider: walletProvider,
  network: networkId,
  walletId: idSchema.optional(),
});
export const connectWalletResponseSchema = z.object({
  connected: z.literal(true),
  provider: walletProvider,
  network: networkId,
  address: z.string(),
  sessionId: z.string(),
});
export type ConnectWalletResponse = z.infer<typeof connectWalletResponseSchema>;
