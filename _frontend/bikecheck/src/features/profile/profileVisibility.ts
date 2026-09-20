// How each Visibility reads and what colour it wears, wherever the state is shown.
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
