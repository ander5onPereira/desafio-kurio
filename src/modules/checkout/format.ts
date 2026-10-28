export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

export const PROVIDER_MONOGRAM = { metamask: "M", walletconnect: "W", coinbase: "C" } as const;
