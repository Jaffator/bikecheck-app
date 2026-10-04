// What the ride wears off the picked bike, a row per Tracked Action: where it stood and what the ride adds.
import type { ReactElement } from "react";
import { Box, Group, Progress, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Eyebrow } from "@/components/Eyebrow";
import type { WoreOffLine } from "@/features/rides/rides.types";
import { woreOffColor, woreOffGain, woreOffLabel } from "@/features/rides/woreOff";
import { attentionColor, DUE_FROM, trackedActionKey } from "@/features/service_tracking/attentionLevel";

const BAR_WIDTH = 72;
// The sheet sits on cards.6, where the usual sunk groove disappears.
const TRACK_COLOR = "var(--mantine-color-cards-5)";
// The wear before the ride stays quiet until it reaches the warning level.
const STOOD_COLOR = "text.8";

export function WoreOffLedger({ lines }: { lines: WoreOffLine[] }): ReactElement | null {
  const { t } = useTranslation();

  // No heading over nothing.
  if (lines.length === 0) return null;

  return (
    <Stack gap={8}>
      <Eyebrow>{t("checkIn.woreOff")}</Eyebrow>
      <Stack gap={6}>
        {lines.map((line) => (
          <LedgerRow key={trackedActionKey(line)} line={line} />
        ))}
      </Stack>
      {lines
        .filter((line) => line.after >= DUE_FROM)
        .map((line) => (
          <DueNote key={trackedActionKey(line)} line={line} />
        ))}
    </Stack>
  );
}

function LedgerRow({ line }: { line: WoreOffLine }): ReactElement {
  const { t } = useTranslation();

  return (
    <Group gap={10} wrap="nowrap">
      <Text fz={13} c="text.6" lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
        {woreOffLabel(line, t)}
      </Text>
      <WearBar line={line} />
      <Text
        w={40}
        ta="right"
        fz={12}
        fw={600}
        c="primary.6"
        className="tabular-nums"
        style={{ flexShrink: 0, whiteSpace: "nowrap" }}
      >
        {woreOffGain(line, t)}
      </Text>
    </Group>
  );
}

// Past due the bar is simply full; the note under the rows gives the figure.
function WearBar({ line }: { line: WoreOffLine }): ReactElement {
  const before = Math.min(line.before, 100);
  const after = Math.min(line.after, 100);

  return (
    <Progress.Root
      size={4}
      radius="xl"
      w={BAR_WIDTH}
      style={{ flexShrink: 0, backgroundColor: TRACK_COLOR }}
    >
      <Progress.Section value={before} color={woreOffColor(line) ?? STOOD_COLOR} />
      {/* A ride under a whole percent still shows. */}
      <Progress.Section value={after - before} color="primary.6" style={{ minWidth: 4 }} />
    </Progress.Root>
  );
}

function DueNote({ line }: { line: WoreOffLine }): ReactElement {
  const { t } = useTranslation();
  const key = line.after >= 100 ? "checkIn.woreOffOverdue" : "checkIn.woreOffDueSoon";

  return (
    <Group gap={8} wrap="nowrap">
      <Box
        w={7}
        h={7}
        style={{ borderRadius: "50%", backgroundColor: attentionColor(line.after), flexShrink: 0 }}
      />
      <Text fz={12} c="text.7" className="tabular-nums" lineClamp={1} style={{ minWidth: 0 }}>
        {t(key, { name: woreOffLabel(line, t), value: line.after })}
      </Text>
    </Group>
  );
}
