// PROTOTYPE #121 — the way into the drawer from the garage (round 1's B): an icon in the
// header beside the bell. /bikes is a main tab, so its header has no actionSlot. The
// switcher's toggle shows it on every main tab instead, to judge whether it belongs there.
import type { ReactElement } from "react";
import { ActionIcon } from "@mantine/core";
import { useLocation } from "react-router-dom";
import { Globe, Share2, Users } from "lucide-react";
import { usePrototypeStore } from "./prototype.store";
import { STATE_COLOR } from "./shared";

export function HeaderShareIcon(): ReactElement | null {
  const everywhere = usePrototypeStore((state) => state.headerIconEverywhere);
  const visibility = usePrototypeStore((state) => state.visibility);
  const open = usePrototypeStore((state) => state.openDrawer);
  const { pathname } = useLocation();
  if (!import.meta.env.DEV) return null;
  if (!everywhere && pathname !== "/bikes") return null;
  const color = visibility === "OFF" ? "var(--mantine-color-cards-1)" : STATE_COLOR[visibility];

  return (
    <ActionIcon variant="transparent" radius="sm" size="lg" aria-label="Sdílení garáže" onClick={open}>
      {visibility === "PUBLIC" && <Globe size={24} color={color} />}
      {visibility === "FOLLOWERS" && <Users size={24} color={color} />}
      {visibility === "OFF" && <Share2 size={24} color={color} />}
    </ActionIcon>
  );
}
