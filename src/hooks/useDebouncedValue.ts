import { useEffect, useState } from "react";

/** Devolve `value` atrasado em `delay` ms (ex.: busca digitada → só consulta quando para de digitar). */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
