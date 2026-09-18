// PROTOTYPE #121 / #128 / #129 — throwaway. In-memory state shared by every surface of the
// share-profile prototype, so flipping visibility in the drawer changes the dashboard card,
// Settings row, badge and the Follows screen at once. Nothing here talks to the backend.
//
// #121 (drawer with cards) and #128 (Follows as panels) are settled. The variant axis
// now drives somebody's profile (#129): hero card, panels, or a contact card.
import { create } from "zustand";
import { suggestHandle } from "./handle";
import type { FollowStatus } from "./people";

export type Visibility = "OFF" | "FOLLOWERS" | "PUBLIC";
export type Variant = "1" | "2" | "3";
export type SectionKey = "components" | "setup" | "history" | "costs";

export const VARIANTS: Variant[] = ["1", "2", "3"];
export const VARIANT_NAMES: Record<Variant, string> = {
  "1": "Hero",
  "2": "Panely",
  "3": "Vizitka",
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

// handle -> status. Outgoing is what I asked for, incoming is what others asked of me.
type Relations = Record<string, FollowStatus>;

const SEED_FOLLOWING: Relations = {
  "martin-k": "ACCEPTED",
  tomas_h: "ACCEPTED",
  verca: "ACCEPTED",
  "honza-gravel": "ACCEPTED",
  "lucie.b": "PENDING",
  ondra_enduro: "PENDING",
};

const SEED_FOLLOWERS: Relations = {
  "martin-k": "ACCEPTED",
  kata: "ACCEPTED",
  zuzka: "ACCEPTED",
  "pepa-mtb": "ACCEPTED",
  rider03: "ACCEPTED",
  rider07: "ACCEPTED",
  rider12: "ACCEPTED",
  anet: "PENDING",
  "radek-r": "PENDING",
};

const VIEWS = 128;

function without(relations: Relations, handle: string): Relations {
  return Object.fromEntries(Object.entries(relations).filter(([key]) => key !== handle));
}

interface PrototypeStore {
  variant: Variant;
  setVariant: (variant: Variant) => void;
  visibility: Visibility;
  setVisibility: (visibility: Visibility) => void;
  handle: string;
  setHandle: (handle: string) => void;
  sections: Record<SectionKey, boolean>;
  toggleSection: (key: SectionKey) => void;
  // Default is shared (#115: bikes.is_shared default true), so only the exceptions are kept.
  unsharedBikeIds: number[];
  toggleBike: (id: number) => void;
  drawerOpened: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  // #128 — the follow graph around me, both directions.
  following: Relations;
  followers: Relations;
  // PUBLIC takes at once, FOLLOWERS waits (#124 POST /follows/:handle).
  follow: (handle: string, visibility: Visibility) => void;
  // Withdraw a request or stop following: the row is simply gone (#124 DELETE /follows/:handle).
  unfollow: (handle: string) => void;
  accept: (handle: string) => void;
  // Decline a request or remove a follower: same act, the row is gone (#124).
  removeFollower: (handle: string) => void;
  // The undo of variant 3: puts a removed row back as it was.
  restoreFollower: (handle: string, status: FollowStatus) => void;
  // Empties both lists to look at the empty states; seeds them again to look at the rest.
  seed: (kind: "full" | "empty") => void;
}

export const usePrototypeStore = create<PrototypeStore>((set) => ({
  variant: "1",
  setVariant: (variant) => set({ variant }),
  visibility: "FOLLOWERS",
  setVisibility: (visibility) =>
    set((state) => {
      // #125: turning PUBLIC is the one change that touches follows - every waiting
      // request is accepted, since nothing waits on a public profile.
      if (visibility !== "PUBLIC") return { visibility };
      const followers: Relations = {};
      for (const [handle] of Object.entries(state.followers)) followers[handle] = "ACCEPTED";
      return { visibility, followers };
    }),
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
  drawerOpened: false,
  openDrawer: () => set({ drawerOpened: true }),
  closeDrawer: () => set({ drawerOpened: false }),
  following: SEED_FOLLOWING,
  followers: SEED_FOLLOWERS,
  follow: (handle, visibility) =>
    set((state) => ({
      following: { ...state.following, [handle]: visibility === "PUBLIC" ? "ACCEPTED" : "PENDING" },
    })),
  unfollow: (handle) => set((state) => ({ following: without(state.following, handle) })),
  accept: (handle) => set((state) => ({ followers: { ...state.followers, [handle]: "ACCEPTED" } })),
  removeFollower: (handle) => set((state) => ({ followers: without(state.followers, handle) })),
  restoreFollower: (handle, status) => set((state) => ({ followers: { ...state.followers, [handle]: status } })),
  seed: (kind) =>
    set(
      kind === "empty"
        ? { following: {}, followers: {} }
        : { following: SEED_FOLLOWING, followers: SEED_FOLLOWERS },
    ),
}));

// The dashboard's figures, read off the graph so a request accepted on the Follows screen
// moves the number on the card.
export function useStats(): Stats {
  const followers = usePrototypeStore((state) => state.followers);
  const entries = Object.values(followers);
  return {
    followers: entries.filter((status) => status === "ACCEPTED").length,
    pending: entries.filter((status) => status === "PENDING").length,
    views: VIEWS,
  };
}

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
