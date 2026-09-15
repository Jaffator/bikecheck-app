// What stands where the attention list would be when nothing needs doing: the all-clear,
// said once, so the owner knows the tracking ran and found the bikes ready.
import type { ReactElement } from "react";
import { Center, Paper, Stack, Text } from "@mantine/core";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { QUIET_COLOR } from "@/features/service_tracking/attentionLevel";

// The disc the check sits in, tinted with the quiet colour it is drawn in.
const DISC_SIZE = 56;

export function AllGoodCard(): ReactElement {
  const { t } = useTranslation();

  return (
    <Paper
      radius="lg"
      p="lg"
      style={{
        backgroundColor: "var(--mantine-color-cards-6)",
        backgroundImage: "var(--card-glow)",
        border: "none",
        boxShadow: "var(--elev-panel)",
      }}
    >
      <Stack gap="sm" align="center">
        <Center
          w={DISC_SIZE}
          h={DISC_SIZE}
          style={{
            borderRadius: "50%",
            backgroundColor: `${QUIET_COLOR}1A`,
            border: `1px solid ${QUIET_COLOR}40`,
          }}
        >
          <Check size={24} color={QUIET_COLOR} strokeWidth={2.5} />
        </Center>

        <Stack gap={4} align="center">
          <Text fz={15} fw={600} c="text.6">
            {t("tracking.allGoodTitle")}
          </Text>
          <Text fz={13} c="var(--color-text-dim)" ta="center">
            {t("tracking.allGoodBody")}
          </Text>
        </Stack>
      </Stack>
    </Paper>
  );
}
