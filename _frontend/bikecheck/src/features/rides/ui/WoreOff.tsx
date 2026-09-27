// What a ride wore off its Tracked Actions, under its figures: `Chain · +32 km · 94 → 95 %`.
import type { ReactElement } from "react";
import { Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Eyebrow } from "@/components/Eyebrow";
import { PANEL_HAIRLINE } from "@/components/panelRows";
import { trackedActionKey } from "@/features/service_tracking/attentionLevel";
import type { WoreOffLine } from "@/features/rides/rides.types";
import { woreOffAmount, woreOffColor, woreOffLabel } from "@/features/rides/woreOff";

export function WoreOff({ lines }: { lines: WoreOffLine[] }): ReactElement | null {
  const { t } = useTranslation();

  // No heading over nothing.
  if (lines.length === 0) return null;

  return (
    <Stack gap={6} pt="sm" style={{ borderTop: PANEL_HAIRLINE }}>
      <Eyebrow>{t("rides.woreOff")}</Eyebrow>
      {lines.map((line) => (
        <Group key={trackedActionKey(line)} gap="sm" wrap="nowrap" justify="space-between">
          <Text fz={13} c="text.7" lineClamp={1} style={{ minWidth: 0 }}>
            {woreOffLabel(line, t)}
          </Text>
          <Text className="font-mono" fz={13} c="text.7" style={{ whiteSpace: "nowrap" }}>
            {`${woreOffAmount(line, t)} · ${String(line.before)} → `}
            <Text span inherit c={woreOffColor(line)}>
              {t("tracking.percentage", { value: line.after })}
            </Text>
          </Text>
        </Group>
      ))}
    </Stack>
  );
}
