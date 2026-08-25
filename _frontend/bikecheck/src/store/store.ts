import type { ReactNode } from "react";
import { create } from "zustand";

interface NetworkStore {
  isOfflineWhenCallApi: boolean;
  setOfflineWhenCallApi: (value: boolean) => void;
}

export const useOfflineWhenCallApiStore = create<NetworkStore>((set) => ({
  isOfflineWhenCallApi: false,
  setOfflineWhenCallApi: (value) => set({ isOfflineWhenCallApi: value }),
}));

// Stores page-owned header state beyond the route map.
interface HeaderStore {
  // Overrides the route title when provided.
  titleKey: string | null;
  setTitleKey: (value: string | null) => void;
  // Replaces the header title outright, for a page whose title is not a translation key
  // - a name the user created, an icon beside it. Sub-pages only.
  titleSlot: ReactNode | null;
  setTitleSlot: (value: ReactNode | null) => void;
  // Overrides router back navigation when provided.
  onBack: (() => void) | null;
  setOnBack: (value: (() => void) | null) => void;
  // Hides shared chrome for a page that owns the full screen.
  chromeHidden: boolean;
  setChromeHidden: (value: boolean) => void;
  // Hides the header's back arrow on a step that has no way back — see ADR 0006.
  backHidden: boolean;
  setBackHidden: (value: boolean) => void;
}

export const useHeaderStore = create<HeaderStore>((set) => ({
  titleKey: null,
  setTitleKey: (value) => set({ titleKey: value }),
  titleSlot: null,
  setTitleSlot: (value) => set(() => ({ titleSlot: value })),
  onBack: null,
  // Prevents Zustand from treating the callback as a state updater.
  setOnBack: (value) => set(() => ({ onBack: value })),
  chromeHidden: false,
  setChromeHidden: (value) => set({ chromeHidden: value }),
  backHidden: false,
  setBackHidden: (value) => set({ backHidden: value }),
}));
