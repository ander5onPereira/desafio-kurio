/**
 * Relógio do servidor simulado. Único ponto que lê `Date.now()` dentro de src/mocks.
 * `set(iso)` desloca o "agora" (expiração de token/cotação, datas do recibo); `reset()` volta ao real.
 * Se o teste usar `page.clock`, o Date do navegador já vem controlado e este offset soma por cima.
 */
let offsetMs = 0;

export const clock = {
  now: (): number => Date.now() + offsetMs,
  iso: (): string => new Date(Date.now() + offsetMs).toISOString(),
  set(iso: string): void {
    const target = new Date(iso).getTime();
    if (Number.isNaN(target)) throw new Error(`Data inválida: ${iso}`);
    offsetMs = target - Date.now();
  },
  reset(): void {
    offsetMs = 0;
  },
};
