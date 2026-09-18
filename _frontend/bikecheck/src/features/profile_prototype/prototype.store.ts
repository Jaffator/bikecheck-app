// PROTOTYPE #121 — throwaway. In-memory state shared by every surface of the share-profile
// prototype, so flipping visibility in the drawer changes the dashboard card, Settings row
// and badge at once. Nothing here talks to the backend.
//
// Round 2: dashboard, Settings and the garage entry are settled (round 1 is kept as a patch
// in Design/). The variant axis is now the drawer alone: plain rows, rows in cards, or
// cards on a darker sheet so they get their contrast from the ground like Settings does.
import { create } from "zustand";
import { suggestHandle } from "./handle";

export type Visibility = "OFF" | "FOLLOWERS" | "PUBLIC";
export type Variant = "1" | "2" | "3";
export type SectionKey = "components" | "setup" | "history" | "costs";

export const VARIANTS: Variant[] = ["1", "2", "3"];
export const VARIANT_NAMES: Record<Variant, string> = {
  "1": "Drawer bez karet",
  "2": "Drawer s kartami",
  "3": "Karty na tmavém sheetu",
};

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  OFF: "Vypnuto",
  FOLLOWERS: "Jen sledující",
  PUBLIC: "Veřejný",
};

export const VISIBILITY_HINT: Record<Visibility, string> = {
  OFF: "Nikdo nic nevidí. Nastavení i adresa zůstávají.",
  FOLLOWERS: "Vidí jen schválení sledující v appce. Žádný webový odkaz.",
  PUBLIC: "Kdokoli s odkazem. V appce sledování bez schvalování.",
};

export interface Stats {
  followers: number;
  pending: number;
  views: number;
}

interface PrototypeStore {
  variant: Variant;
  setVariant: (variant: Variant) => void;
  // Whether the header share icon shows on every main tab or on the garage only.
  headerIconEverywhere: boolean;
  setHeaderIconEverywhere: (value: boolean) => void;
  visibility: Visibility;
  setVisibility: (visibility: Visibility) => void;
  handle: string;
  setHandle: (handle: string) => void;
  sections: Record<SectionKey, boolean>;
  toggleSection: (key: SectionKey) => void;
  // Default is shared (#115: bikes.is_shared default true), so only the exceptions are kept.
  unsharedBikeIds: number[];
  toggleBike: (id: number) => void;
  stats: Stats;
  drawerOpened: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

export const usePrototypeStore = create<PrototypeStore>((set) => ({
  variant: "1",
  setVariant: (variant) => set({ variant }),
  headerIconEverywhere: false,
  setHeaderIconEverywhere: (value) => set({ headerIconEverywhere: value }),
  visibility: "PUBLIC",
  setVisibility: (visibility) => set({ visibility }),
  handle: suggestHandle(null),
  setHandle: (handle) => set({ handle }),
  sections: { components: true, setup: true, history: true, costs: false },
  toggleSection: (key) =>
    set((state) => {
      const next = { ...state.sections, [key]: !state.sections[key] };
      // Costs ride on history (#117): switching history off takes costs with it.
      if (key === "history" && !next.history) next.costs = false;
      return { sections: next };
    }),
  unsharedBikeIds: [],
  toggleBike: (id) =>
    set((state) => ({
      unsharedBikeIds: state.unsharedBikeIds.includes(id)
        ? state.unsharedBikeIds.filter((other) => other !== id)
        : [...state.unsharedBikeIds, id],
    })),
  stats: { followers: 14, pending: 2, views: 128 },
  drawerOpened: false,
  openDrawer: () => set({ drawerOpened: true }),
  closeDrawer: () => set({ drawerOpened: false }),
}));

// Which figures a state has: requests only exist while approval does, views only while a
// web page does (#115 view_count counts the web page, FOLLOWERS has none).
export function statsFor(visibility: Visibility, stats: Stats): { label: string; value: number }[] {
  if (visibility === "FOLLOWERS") {
    return [
      { label: "Sledující", value: stats.followers },
      { label: "Žádosti", value: stats.pending },
    ];
  }
  if (visibility === "PUBLIC") {
    return [
      { label: "Sledující", value: stats.followers },
      { label: "Zobrazení", value: stats.views },
    ];
  }
  return [];
}
