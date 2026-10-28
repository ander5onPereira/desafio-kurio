/**
 * Nome ENS no formulário = campo de texto + seletor de sufixo (Figma: ".eth ⌄").
 * No contrato (API) o nome trafega completo: "nova" + ".kurio.eth" → "nova.kurio.eth".
 */
export const ENS_SUFFIXES = [".eth", ".kurio.eth"] as const;
export type EnsSuffix = (typeof ENS_SUFFIXES)[number];
export const DEFAULT_ENS_SUFFIX: EnsSuffix = ".eth";

export function splitEnsName(full: string | null | undefined): { name: string; suffix: EnsSuffix } {
  const value = (full ?? "").trim();
  const match = [...ENS_SUFFIXES]
    .sort((a, b) => b.length - a.length)
    .find((suffix) => value.toLowerCase().endsWith(suffix));
  if (!match) return { name: value, suffix: DEFAULT_ENS_SUFFIX };
  return { name: value.slice(0, value.length - match.length), suffix: match };
}

export function joinEnsName(name: string, suffix: EnsSuffix): string {
  const trimmed = name.trim();
  return trimmed ? `${trimmed}${suffix}` : "";
}
