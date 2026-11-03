// What a ride wore off, as the ride drawer's card: `Chain   0 % → 2 %`, the end coloured by level.
import type { ReactElement } from "react";
import { Box, Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Eyebrow } from "@/components/Eyebrow";
import { PANEL_HAIRLINE } from "@/components/panelRows";
import type { WoreOffLine } from "@/features/rides/rides.types";
import { woreOffColor, woreOffLabel } from "@/features/rides/woreOff";
import { trackedActionKey } from "@/features/service_tracking/attentionLevel";
import { RIDE_CARD_STYLE } from "./rideCard";

const ROW_HEIGHT = 44;

export function WoreOffCard({ lines }: { lines: WoreOffLine[] }): ReactElement | null {
  const { t } = useTranslation();

  // No heading over nothing.
  if (lines.length === 0) return null;

  return (
    <Stack gap={8}>
      <Eyebrow>{t("checkIn.woreOff")}</Eyebrow>
      <Box px="md" style={RIDE_CARD_STYLE}>
        {lines.map((line, index) => (
          <WearRow key={trackedActionKey(line)} line={line} separated={index > 0} />
        ))}
      </Box>
    </Stack>
  );
}

function WearRow({ line, separated }: { line: WoreOffLine; separated: boolean }): ReactElement {
  const { t } = useTranslation();

  return (
    <Group
      justify="space-between"
      gap="sm"
      wrap="nowrap"
      mih={ROW_HEIGHT}
      style={{ borderTop: separated ? PANEL_HAIRLINE : undefined }}
    >
      <Text fz={14} c="text.6" lineClamp={1} style={{ minWidth: 0 }}>
        {woreOffLabel(line, t)}
      </Text>
      <Text className="tabular-nums" fz={13} c={woreOffColor(line) ?? "text.7"} style={{ whiteSpace: "nowrap" }}>
        <Text span inherit c="text.8">
          {`${t("tracking.percentage", { value: line.before })} → `}
        </Text>
        {t("tracking.percentage", { value: line.after })}
      </Text>
    </Group>
  );
}
