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
  // Lets a page run its content up under the header: the controls stay, the background
  // goes, and a scrim keeps them legible over whatever passes beneath. The bike detail
  // page is the first to use it; any detail page that leads with an image can.
  headerTransparent: boolean;
  setHeaderTransparent: (value: boolean) => void;
  // Hides the header's back arrow on a step that has no way back — see ADR 0006.
  backHidden: boolean;
  setBackHidden: (value: boolean) => void;
  // A control the page hangs at the right edge of the header — the history's period filter.
  // Sub-pages only: the main tabs already carry the avatar, bell and settings there.
  actionSlot: ReactNode | null;
  setActionSlot: (value: ReactNode | null) => void;
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
  headerTransparent: false,
  setHeaderTransparent: (value) => set({ headerTransparent: value }),
  backHidden: false,
  setBackHidden: (value) => set({ backHidden: value }),
  actionSlot: null,
  setActionSlot: (value) => set(() => ({ actionSlot: value })),
}));

// The overlays standing over the page, oldest first. Android's back gesture means "dismiss
// the thing on top", so the hardware handler empties this before it touches the router -
// see useOverlayBack and AppLayout.
interface Overlay {
  id: number;
  close: () => void;
}

interface OverlayStore {
  stack: Overlay[];
  pushOverlay: (overlay: Overlay) => void;
  removeOverlay: (id: number) => void;
  // True when there was one to close, which is also when the router must stay put.
  closeTopOverlay: () => boolean;
}

export const useOverlayStore = create<OverlayStore>((set, get) => ({
  stack: [],
  pushOverlay: (overlay) => set((state) => ({ stack: [...state.stack, overlay] })),
  removeOverlay: (id) => set((state) => ({ stack: state.stack.filter((item) => item.id !== id) })),
  closeTopOverlay: () => {
    const { stack } = get();
    const top = stack[stack.length - 1];
    if (!top) return false;
    // The owner's state change unmounts the entry, which removes it from the stack.
    top.close();
    return true;
  },
}));
