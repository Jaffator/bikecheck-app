// What stands where the attention list would be when nothing needs doing: the all-clear,
// said once, so the owner knows the tracking ran and found the bikes ready.
import type { ReactElement } from "react";
import { Center, Group, Paper, Stack, Text } from "@mantine/core";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { QUIET_COLOR } from "@/features/service_tracking/attentionLevel";

// The disc the check sits in, tinted with the quiet colour it is drawn in.
const DISC_SIZE = 36;

export function AllGoodCard(): ReactElement {
  const { t } = useTranslation();

  return (
    <Paper
      radius="lg"
      p="md"
      style={{
        backgroundColor: "var(--mantine-color-cards-6)",
        backgroundImage: "var(--card-glow)",
        border: "none",
        boxShadow: "var(--elev-panel)",
      }}
    >
      {/* One row, not a centred stack: nothing to do is the least of what a page has to say. */}
      <Group gap="sm" wrap="nowrap" align="center">
        <Center
          w={DISC_SIZE}
          h={DISC_SIZE}
          style={{
            flexShrink: 0,
            borderRadius: "50%",
            backgroundColor: `${QUIET_COLOR}1A`,
            border: `1px solid ${QUIET_COLOR}40`,
          }}
        >
          <Check size={18} color={QUIET_COLOR} strokeWidth={2.5} />
        </Center>

        <Stack gap={2} style={{ minWidth: 0 }}>
          <Text fz={14} fw={600} c="text.6">
            {t("tracking.allGoodTitle")}
          </Text>
          <Text fz={12} c="var(--color-text-dim)">
            {t("tracking.allGoodBody")}
          </Text>
        </Stack>
      </Group>
    </Paper>
  );
}
