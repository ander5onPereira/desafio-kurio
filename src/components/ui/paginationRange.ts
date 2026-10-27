export type PageItem = number | "ellipsis-start" | "ellipsis-end";

/**
 * Calcula os itens da paginação: sempre primeira e última página, a atual com `siblings` vizinhas
 * de cada lado e reticências quando há salto. Ex.: (page 5, total 12) → 1 … 4 5 6 … 12.
 * Para poucas páginas (≤ 7) mostra todas.
 */
export function getPageRange(page: number, totalPages: number, siblings = 1): PageItem[] {
  if (totalPages <= 0) return [];
  const maxWithoutEllipsis = siblings * 2 + 5;
  if (totalPages <= maxWithoutEllipsis) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const current = Math.min(Math.max(page, 1), totalPages);
  const left = Math.max(current - siblings, 2);
  const right = Math.min(current + siblings, totalPages - 1);
  const items: PageItem[] = [1];

  if (left > 2) items.push("ellipsis-start");
  for (let value = left; value <= right; value++) items.push(value);
  if (right < totalPages - 1) items.push("ellipsis-end");
  items.push(totalPages);
  return items;
}
