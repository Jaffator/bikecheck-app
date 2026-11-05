// PROTOTYPE for #337, never merged: in memory, what users.hints_seen and hints_enabled will hold.
import { create } from "zustand";

interface HintStore {
  seen: string[];
  enabled: boolean;
  dismiss: (key: string) => void;
  setEnabled: (enabled: boolean) => void;
  reset: () => void;
}

export const useHintStore = create<HintStore>((set) => ({
  seen: [],
  enabled: true,
  dismiss: (key) => set((state) => ({ seen: [...state.seen, key] })),
  setEnabled: (enabled) => set({ enabled }),
  reset: () => set({ seen: [] }),
}));
