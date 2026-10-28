import { useSyncExternalStore } from "react";

let isOpen = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export const searchDialog = {
  open() {
    isOpen = true;
    emit();
  },
  close() {
    isOpen = false;
    emit();
  },
  set(value: boolean) {
    isOpen = value;
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => isOpen,
};

export function useSearchDialogOpen(): boolean {
  return useSyncExternalStore(searchDialog.subscribe, searchDialog.getSnapshot, searchDialog.getSnapshot);
}
