// The state written under a rider's name: icon and label in the state colour. Nothing
// when Off - a rider who shares nothing wears nothing.
import type { ReactElement } from "react";
import { Group, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { ProfileVisibility } from "../profile.types";
import { VISIBILITY_COLOR, VISIBILITY_ICON, VISIBILITY_LABEL_KEY } from "../profileVisibility";

interface VisibilityBadgeProps {
  visibility: ProfileVisibility;
}

export function VisibilityBadge({ visibility }: VisibilityBadgeProps): ReactElement | null {
  const { t } = useTranslation();
  if (visibility === "OFF") return null;

  const Icon = VISIBILITY_ICON[visibility];
  const color = VISIBILITY_COLOR[visibility];

  return (
    <Group gap={4} wrap="nowrap" style={{ color }}>
      <Icon size={13} />
      <Text fz={12} fw={600} style={{ color: "inherit" }}>
        {t(VISIBILITY_LABEL_KEY[visibility])}
      </Text>
    </Group>
  );
}
