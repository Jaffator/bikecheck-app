// The way into the share drawer from the garage: one icon beside the bell, coloured by the
// sharing state. The Bikes page hangs it in the header's action slot, so it is on /bikes only.
import { useState, type ReactElement } from "react";
import { ActionIcon } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useMyProfile } from "../profile.queries";
import { VISIBILITY_COLOR, VISIBILITY_ICON } from "../profileVisibility";
import { ShareDrawer } from "./ShareDrawer";

// Matches the bell it stands beside.
const ICON_SIZE = 24;

export function HeaderShareIcon(): ReactElement | null {
  const { t } = useTranslation();
  const { data: profile } = useMyProfile();
  const [sharing, setSharing] = useState(false);
  // No icon until the state is known, rather than one that flips colour a moment later.
  if (!profile) return null;

  const Icon = VISIBILITY_ICON[profile.visibility];

  return (
    <>
      <ActionIcon variant="transparent" radius="sm" size="lg" aria-label={t("sharing.headerIcon")} onClick={() => setSharing(true)}>
        <Icon size={ICON_SIZE} color={VISIBILITY_COLOR[profile.visibility]} />
      </ActionIcon>
      <ShareDrawer opened={sharing} onClose={() => setSharing(false)} />
    </>
  );
}
