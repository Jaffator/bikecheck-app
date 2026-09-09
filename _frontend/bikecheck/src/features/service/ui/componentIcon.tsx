// The picture a part is recognised by. Shared by every place a part is named — the chips
// the work is recorded against, the list a recorded Service is read back from — so one
// kind of part looks the same throughout.
import type { ReactElement } from "react";
import { Component } from "lucide-react";
import { componentIcon } from "@/assets/icons/svg_icons/components";

const DEFAULT_ICON_SIZE = 16;

// A seeded component type has an icon of its own; anything else takes the generic one.
export function componentTypeIcon(componentType: string, size: number = DEFAULT_ICON_SIZE): ReactElement {
  const Icon = componentIcon(componentType);
  if (!Icon) {
    return <Component size={size} color="var(--mantine-color-primary-7)" style={{ flexShrink: 0 }} />;
  }
  return <Icon width={size} height={size} color="var(--mantine-color-primary-7)" style={{ flexShrink: 0 }} />;
}
