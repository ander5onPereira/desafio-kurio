import { useRef, type RefObject } from "react";

/**
 * O Radix Dialog só devolve o foco ao fechar quando existe um `Dialog.Trigger`. Nossos diálogos são
 * CONTROLADOS (abertos por estado/store), então guardamos quem tinha o foco ao abrir e o restauramos
 * ao fechar (requisito de acessibilidade: foco devolvido ao gatilho).
 * `initialFocusRef` (opcional) escolhe quem recebe o foco ao abrir.
 */
export function useRestoreFocus(initialFocusRef?: RefObject<HTMLElement | null>) {
  const previous = useRef<HTMLElement | null>(null);

  return {
    onOpenAutoFocus(event: Event) {
      previous.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (initialFocusRef?.current) {
        event.preventDefault();
        initialFocusRef.current.focus();
      }
    },
    onCloseAutoFocus(event: Event) {
      const target = previous.current;
      previous.current = null;
      if (target?.isConnected) {
        event.preventDefault();
        target.focus();
      }
    },
  };
}
