// How each Visibility reads, what colour it wears and which icon marks it, wherever the
// state is shown.
import { Globe, Share2, Users, type LucideIcon } from "lucide-react";
import type { ProfileVisibility } from "./profile.types";

export const VISIBILITY_LABEL_KEY: Record<ProfileVisibility, string> = {
  OFF: "sharing.visibilityOff",
  FOLLOWERS: "sharing.visibilityFollowers",
  PUBLIC: "sharing.visibilityPublic",
};

// One sentence under the control, saying who sees what in the chosen state.
export const VISIBILITY_HINT_KEY: Record<ProfileVisibility, string> = {
  OFF: "sharing.hintOff",
  FOLLOWERS: "sharing.hintFollowers",
  PUBLIC: "sharing.hintPublic",
};

export const VISIBILITY_COLOR: Record<ProfileVisibility, string> = {
  OFF: "var(--color-text-dim)",
  FOLLOWERS: "var(--mantine-color-blue-4)",
  PUBLIC: "var(--mantine-color-green-8)",
};

// Off has no state to show, so its icon is the act of sharing itself.
export const VISIBILITY_ICON: Record<ProfileVisibility, LucideIcon> = {
  OFF: Share2,
  FOLLOWERS: Users,
  PUBLIC: Globe,
};
