// What a ride wore off, as the ride drawer's card: `Chain   0 % → 2 %`, the end coloured by level.
import { useState, type ReactElement } from "react";
import { Box, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Eyebrow } from "@/components/Eyebrow";
import { PANEL_HAIRLINE } from "@/components/panelRows";
import type { WoreOffLine } from "@/features/rides/rides.types";
import { woreOffColor, woreOffLabel } from "@/features/rides/woreOff";
import { trackedActionKey } from "@/features/service_tracking/attentionLevel";
import { RIDE_CARD_STYLE } from "./rideCard";

const ROW_HEIGHT = 44;
// The lines closest to due; the rest waits behind the toggle.
const LEAD_LINES = 3;

export function WoreOffCard({ lines }: { lines: WoreOffLine[] }): ReactElement | null {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const hidden = lines.length - LEAD_LINES;
  const shown = expanded ? lines : lines.slice(0, LEAD_LINES);

  // No heading over nothing.
  if (lines.length === 0) return null;

  return (
    <Stack gap={8}>
      <Eyebrow>{t("checkIn.woreOff")}</Eyebrow>
      <Box px="md" style={RIDE_CARD_STYLE}>
        {shown.map((line, index) => (
          <WearRow key={trackedActionKey(line)} line={line} separated={index > 0} />
        ))}
        {hidden > 0 && (
          <UnstyledButton
            w="100%"
            h={ROW_HEIGHT}
            style={{ borderTop: PANEL_HAIRLINE }}
            onClick={() => setExpanded(!expanded)}
          >
            <Text className="tabular-nums" fz={11} tt="uppercase" c="primary.6" lts="var(--tracking-label)">
              {expanded ? t("tracking.showLess") : t("tracking.showRemaining", { value: hidden })}
            </Text>
          </UnstyledButton>
        )}
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
      <Text fz={14} fw={600} c="text.6" lineClamp={1} style={{ minWidth: 0 }}>
        {woreOffLabel(line, t)}
      </Text>
      <Text
        className="tabular-nums"
        fz={13}
        fw={700}
        c={woreOffColor(line) ?? "text.6"}
        style={{ whiteSpace: "nowrap" }}
      >
        <Text span inherit fw={400} c="text.8">
          {`${t("tracking.percentage", { value: line.before })} → `}
        </Text>
        {t("tracking.percentage", { value: line.after })}
      </Text>
    </Group>
  );
}
