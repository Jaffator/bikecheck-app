import { create } from "zustand";

interface NetworkStore {
  isOfflineWhenCallApi: boolean;
  setOfflineWhenCallApi: (value: boolean) => void;
}

export const useOfflineWhenCallApiStore = create<NetworkStore>((set) => ({
  isOfflineWhenCallApi: false,
  setOfflineWhenCallApi: (value) => set({ isOfflineWhenCallApi: value }),
}));

// The header lives in AppLayout, but a page can be in a state the route map
// knows nothing about — it publishes its own title and back action here for
// that case. A multi-step page owns "one level back", not the router.
interface HeaderStore {
  // Translation key, or null to fall back to the route's own title.
  titleKey: string | null;
  setTitleKey: (value: string | null) => void;
  // Runs instead of the router's back, or null to leave back alone.
  onBack: (() => void) | null;
  setOnBack: (value: (() => void) | null) => void;
  // Set by a page that takes the whole screen and carries its own single action,
  // where a title bar and a back arrow would only offer a way to abandon it.
  chromeHidden: boolean;
  setChromeHidden: (value: boolean) => void;
}

export const useHeaderStore = create<HeaderStore>((set) => ({
  titleKey: null,
  setTitleKey: (value) => set({ titleKey: value }),
  onBack: null,
  // Wrapped in a setter callback — zustand would otherwise call a bare
  // function argument as a state updater.
  setOnBack: (value) => set(() => ({ onBack: value })),
  chromeHidden: false,
  setChromeHidden: (value) => set({ chromeHidden: value }),
}));
