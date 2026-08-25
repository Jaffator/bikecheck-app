// The picture a Component Category is recognised by. Shared by every place a category is
// named — the tiles it is chosen from, the header of the step inside it, the summary card
// it ends up on — so one category looks the same throughout the wizard.
import type { ReactElement } from "react";
import { Wrench } from "lucide-react";
import { groupIcon } from "@/assets/icons/svg_icons/groups";

const DEFAULT_ICON_SIZE = 30;

// A seeded category has an icon of its own; anything else takes the generic one.
export function categoryIcon(groupName: string, size: number = DEFAULT_ICON_SIZE): ReactElement {
  const Icon = groupIcon(groupName);
  if (!Icon) {
    return <Wrench size={size} color="var(--mantine-color-primary-5)" />;
  }
  return <Icon width={size} height={size} color="var(--mantine-color-primary-5)" />;
}
