/** Endereço abreviado como no Figma: 0xA91F…E82C. */
export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

/** Monograma do provedor (ícone do card). */
export const PROVIDER_MONOGRAM = { metamask: "M", walletconnect: "W", coinbase: "C" } as const;
