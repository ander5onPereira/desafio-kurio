import { z } from "zod";
import {
  isValidAddress,
  NETWORK_IDS,
  walletFieldsSchema,
  WALLET_PROVIDERS,
  type Wallet,
  type WalletInput,
  type WalletRole,
} from "@/contracts";

/**
 * Schema do formulário de carteira = campos do contrato + mensagens em PT-BR para os selects
 * (a mensagem padrão do Zod para enum é em inglês) + regra de endereço por rede.
 * O corpo enviado à API continua sendo `WalletInput` do contrato.
 */
export const walletFormSchema = walletFieldsSchema
  .extend({
    network: z.enum(NETWORK_IDS, "Selecione uma rede"),
    walletType: z.enum(WALLET_PROVIDERS, "Selecione o tipo de carteira"),
  })
  .superRefine((value, ctx) => {
    if (value.address && !isValidAddress(value.network, value.address)) {
      ctx.addIssue({
        code: "custom",
        path: ["address"],
        message: "Endereço inválido para a rede selecionada",
      });
    }
  });

export const WALLET_FIELD_NAMES = [
  "displayName",
  "nickname",
  "network",
  "profileName",
  "address",
  "secondaryRef",
  "walletType",
  "referralCode",
  "email",
  "ensName",
] as const satisfies readonly (keyof WalletInput)[];

/** Valores iniciais do formulário (select sem escolha = undefined → mostra o placeholder). */
export type WalletFormDefaults = Partial<WalletInput> & { role: WalletRole };

export function walletToDefaults(wallet: Wallet): WalletFormDefaults {
  return {
    role: wallet.role,
    displayName: wallet.displayName,
    nickname: wallet.nickname,
    network: wallet.network,
    profileName: wallet.profileName,
    address: wallet.address,
    secondaryRef: wallet.secondaryRef ?? "",
    walletType: wallet.walletType,
    referralCode: wallet.referralCode,
    email: wallet.email,
    ensName: wallet.ensName,
  };
}

export function copyFromPrimary(primary: Wallet, role: WalletRole): WalletFormDefaults {
  return { ...walletToDefaults(primary), role };
}
