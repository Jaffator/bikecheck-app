// Home's garage chip: who sees the garage, and the share sheet to change it.
import { useState, type ReactElement } from "react";
import { Text } from "@mantine/core";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatusChip } from "@/components/StatusChip";
import { useMyProfile } from "../profile.queries";
import { VISIBILITY_COLOR, VISIBILITY_ICON, VISIBILITY_LABEL_KEY } from "../profileVisibility";
import { ShareDrawer } from "./ShareDrawer";

export function GarageVisibilityChip(): ReactElement | null {
  const { t } = useTranslation();
  const { data: profile } = useMyProfile();
  const [sharing, setSharing] = useState(false);

  if (!profile) return null;
  const VisibilityIcon = VISIBILITY_ICON[profile.visibility];
  const visibility = t(VISIBILITY_LABEL_KEY[profile.visibility]);

  return (
    <>
      <StatusChip
        tone="control"
        label={t("dashboard.garageVisibility", { visibility })}
        onClick={() => setSharing(true)}
        hasPopup
        shrink
      >
        <VisibilityIcon size={16} color={VISIBILITY_COLOR[profile.visibility]} style={{ flexShrink: 0 }} />
        <Text span inherit fw={500} c="var(--color-text-dim)">
          {t("dashboard.garageChip")}
        </Text>
        <Text span inherit truncate>
          {visibility}
        </Text>
        <ChevronDown size={16} strokeWidth={2.4} color="var(--mantine-color-primary-6)" style={{ flexShrink: 0 }} />
      </StatusChip>

      <ShareDrawer opened={sharing} onClose={() => setSharing(false)} />
    </>
  );
}
