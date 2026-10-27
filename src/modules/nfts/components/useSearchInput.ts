import { useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 300;

/**
 * Campo de busca ligado à URL, sem laço de atualização:
 *  - digitar → espera 300 ms parado → `commit(q)` (o chamador grava na URL com `replace`);
 *  - Enter → grava na hora;
 *  - a URL mudou por fora (voltar/avançar do histórico, "Limpar filtros") → `resetKey` muda e o
 *    chamador remonta o input (`key={resetKey}`) com o novo valor. Mudança que veio do próprio
 *    `commit` NÃO remonta (o foco não se perde enquanto a pessoa digita).
 */
export function useSearchInput(urlQuery: string | undefined, commit: (query: string) => void) {
  const current = urlQuery ?? "";
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [committed, setCommitted] = useState(current);
  const [seenUrl, setSeenUrl] = useState(current);
  const [resetKey, setResetKey] = useState(0);

  // Ajuste de estado durante a renderização (padrão recomendado pelo React para "derivar" de props).
  if (current !== seenUrl) {
    setSeenUrl(current);
    if (current !== committed) {
      setCommitted(current);
      setResetKey((key) => key + 1);
    }
  }

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const flush = (value: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const next = value.trim();
    setCommitted(next);
    commit(next);
  };

  return {
    resetKey,
    defaultValue: current,
    onChange: (value: string) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => flush(value), DEBOUNCE_MS);
    },
    onSubmit: flush,
  };
}
