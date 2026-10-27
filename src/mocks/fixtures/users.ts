import type { WalletInput } from "@/contracts";
import { TEST_REFERRAL_CODE, TEST_USERS } from "@/contracts";
import { FIGMA_IDS } from "./catalog";

/** Usuários fictícios (credenciais documentadas no README). Senha única: Kurio@2026. */
export interface UserFixture {
  id: string;
  username: string;
  displayName: string;
  email: string;
  password: string;
  /** Sal fixo (hex, 16 bytes) → hash reproduzível. */
  salt: string;
  ensName: string;
  walletNickname: string;
  createdAt: string;
  /** Mais recente primeiro. */
  favorites: string[];
  wallets: Array<WalletInput & { id: string }>;
}

export const USER_FIXTURES: readonly UserFixture[] = [
  {
    id: "usr_ana",
    username: TEST_USERS.ana.username,
    displayName: "Ana Nova",
    email: TEST_USERS.ana.email,
    password: TEST_USERS.ana.password,
    salt: "a1b2c3d4e5f60718293a4b5c6d7e8f90",
    ensName: "ana.eth",
    walletNickname: "Principal",
    createdAt: "2026-03-10T14:00:00.000Z",
    favorites: [FIGMA_IDS.emerald, FIGMA_IDS.neon, FIGMA_IDS.goldenBeat],
    wallets: [
      {
        id: "wal_ana_primary",
        role: "primary",
        displayName: "Ana Nova",
        nickname: "Principal",
        network: "ethereum",
        profileName: "ana.nova",
        address: "0xA91F3c5B7d9E2a4F6b8C0d1E3f5A7b9C1d2eE82C",
        secondaryRef: null,
        walletType: "metamask",
        referralCode: TEST_REFERRAL_CODE,
        email: TEST_USERS.ana.email,
        ensName: "ana.eth",
      },
      {
        id: "wal_ana_secondary",
        role: "secondary",
        displayName: "Ana Nova",
        nickname: "Reserva",
        network: "polygon",
        profileName: "ana.nova",
        address: "0x4F2a8B6c1D9e3F5a7C0b2E4d6A8c1F3e5B7d9A0c",
        secondaryRef: "nova.kurio.eth",
        walletType: "walletconnect",
        referralCode: TEST_REFERRAL_CODE,
        email: TEST_USERS.ana.email,
        ensName: "nova.kurio.eth",
      },
    ],
  },
  {
    id: "usr_bruno",
    username: TEST_USERS.bruno.username,
    displayName: "Bruno Vega",
    email: TEST_USERS.bruno.email,
    password: TEST_USERS.bruno.password,
    salt: "0f1e2d3c4b5a69788796a5b4c3d2e1f0",
    ensName: "bruno.eth",
    walletNickname: "Principal",
    createdAt: "2026-04-22T09:30:00.000Z",
    favorites: [FIGMA_IDS.sage, FIGMA_IDS.ivory],
    wallets: [
      {
        id: "wal_bruno_primary",
        role: "primary",
        displayName: "Bruno Vega",
        nickname: "Principal",
        network: "ethereum",
        profileName: "bruno.vega",
        address: "0x5B3c9D1f7A2e4C6b8D0a1F3e5C7b9A2d4E6f8A0c",
        secondaryRef: null,
        walletType: "coinbase",
        referralCode: TEST_REFERRAL_CODE,
        email: TEST_USERS.bruno.email,
        ensName: "bruno.eth",
      },
    ],
  },
];
