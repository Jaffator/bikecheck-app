// The state written under the owner's name: icon and label in the state colour. Nothing
// when Off - a rider who shares nothing wears nothing.
import type { ReactElement } from "react";
import { Group, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useMyProfile } from "../profile.queries";
import { VISIBILITY_COLOR, VISIBILITY_ICON, VISIBILITY_LABEL_KEY } from "../profileVisibility";

export function VisibilityBadge(): ReactElement | null {
  const { t } = useTranslation();
  const { data: profile } = useMyProfile();
  if (!profile || profile.visibility === "OFF") return null;

  const Icon = VISIBILITY_ICON[profile.visibility];
  const color = VISIBILITY_COLOR[profile.visibility];

  return (
    <Group gap={4} wrap="nowrap" style={{ color }}>
      <Icon size={13} />
      <Text fz={12} fw={600} style={{ color: "inherit" }}>
        {t(VISIBILITY_LABEL_KEY[profile.visibility])}
      </Text>
    </Group>
  );
}
