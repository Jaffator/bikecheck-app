// The one row in Settings that opens the share drawer, with the state beside it. No inline
// control: the drawer is the only place sharing is set.
import { useState, type ReactElement } from "react";
import { Card, Group, Text, UnstyledButton } from "@mantine/core";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMyProfile } from "../profile.queries";
import { VISIBILITY_COLOR, VISIBILITY_LABEL_KEY } from "../profileVisibility";
import { ShareDrawer } from "./ShareDrawer";

// Settings' own rhythm: half the gap between two rows.
const ROW_GAP_HALF = 10;

export function SettingsShareRow(): ReactElement {
  const { t } = useTranslation();
  const { data: profile } = useMyProfile();
  const [sharing, setSharing] = useState(false);
  const visibility = profile?.visibility;

  return (
    <>
      <Card bg="cards.6" className="mx-3 mb-3" px={0} py={ROW_GAP_HALF} radius="lg" style={{ border: "1px solid var(--mantine-color-inputs-5)" }}>
        <UnstyledButton onClick={() => setSharing(true)} className="w-full" px="md" py={ROW_GAP_HALF}>
          <Group justify="space-between" wrap="nowrap">
            <Text fw={600} fz={15} c="text.6">
              {t("sharing.settingsRow")}
            </Text>
            <Group gap="xs" wrap="nowrap">
              {visibility && (
                <Text fz={13} style={{ color: VISIBILITY_COLOR[visibility] }}>
                  {t(VISIBILITY_LABEL_KEY[visibility])}
                </Text>
              )}
              <ChevronRight size={18} color="var(--color-text-dim)" />
            </Group>
          </Group>
        </UnstyledButton>
      </Card>

      <ShareDrawer opened={sharing} onClose={() => setSharing(false)} />
    </>
  );
}
