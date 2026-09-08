// How far every piece of this bike's maintenance has come. One row per Tracked Action —
// one part paired with one action the bike keeps a Service Interval for — worst first, as
// the API already sorts them. Nothing here is stored: the percentages are derived on read
// (ADR 0026), so the section is only ever as fresh as its own request.
import type { ReactElement } from "react";
import { Group, Paper, Progress, Skeleton, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { HEALTH_COLORS } from "@/features/bikes_page/bikeHealth.types";
import { positionLabel } from "@/features/components/componentLabels";
import { useBikeTrackedActions } from "./serviceTracking.queries";
import { axisReadingLabel, percentageLabel, trackedActionName, trackedPartName } from "./trackedActionLabels";
import type { TrackedAction } from "./serviceTracking.types";

// How many rows stand in for the list while it is arriving.
const SKELETON_ROWS = 3;

interface BikeTrackedActionsSectionProps {
  bikeId: number;
}

export function BikeTrackedActionsSection({ bikeId }: BikeTrackedActionsSectionProps): ReactElement | null {
  const { t } = useTranslation();
  const { data: tracked, isLoading, isError } = useBikeTrackedActions(bikeId);

  // A bike with no Service Intervals, or an archived one, tracks nothing — and a section
  // holding nothing is not a section, so it is absent rather than empty.
  if (!isLoading && !isError && (tracked === undefined || tracked.length === 0)) return null;

  return (
    <Stack gap="sm">
      <Text className="font-mono" fz={11} fw={400} tt="uppercase" lts="0.08em" c="var(--color-text-dim)">
        {t("serviceTracking.title")}
      </Text>

      {isLoading && Array.from({ length: SKELETON_ROWS }, (_, index) => <Skeleton key={index} h={56} radius="lg" />)}

      {isError && (
        <Text fz={13} c="red.5">
          {t("serviceTracking.loadFailed")}
        </Text>
      )}

      {tracked !== undefined && tracked.length > 0 && (
        <Paper
          radius="lg"
          style={{
            overflow: "hidden",
            backgroundColor: "var(--mantine-color-cards-6)",
            backgroundImage: "var(--card-glow)",
            border: "none",
            boxShadow: "var(--elev-row)",
          }}
        >
          {tracked.map((action, index) => (
            <TrackedActionRow
              key={`${String(action.component_mounted_id)}:${String(action.action_id)}`}
              action={action}
              first={index === 0}
            />
          ))}
        </Paper>
      )}
    </Stack>
  );
}

// One Tracked Action: the part it is about, the job it is, how far it has come and the
// figure that percentage was taken of.
function TrackedActionRow({ action, first }: { action: TrackedAction; first: boolean }): ReactElement {
  const { t, i18n } = useTranslation();
  const color = HEALTH_COLORS[action.attention_level];
  const position = positionLabel(action.position, t);

  return (
    <Stack gap={8} px="md" py={12} style={first ? undefined : { borderTop: "1px solid var(--color-border-subtle)" }}>
      <Group justify="space-between" wrap="nowrap" align="flex-start" gap="sm">
        <Stack gap={2} style={{ minWidth: 0 }}>
          {/* The part leads: this is a fact about one chain, not about the bike. The side
              rides with it, because that is what tells one bike's two tyres apart. */}
          <Group gap={6} wrap="nowrap">
            <Text fz={15} fw={600} c="text.6" lineClamp={1}>
              {trackedPartName(action, t)}
            </Text>
            {position !== null && (
              <Text
                className="font-mono"
                fz={11}
                tt="uppercase"
                lts="0.08em"
                c="var(--color-text-dim)"
                style={{ flexShrink: 0 }}
              >
                {position}
              </Text>
            )}
          </Group>
          <Text fz={13} c="var(--color-text-dim)" lineClamp={1}>
            {trackedActionName(action, t)}
          </Text>
        </Stack>

        <Stack gap={2} align="flex-end" style={{ flexShrink: 0 }}>
          {/* The percentage carries the colour, so the row is scannable without reading it. */}
          <Text className="font-mono" fz={15} fw={600} c={color} style={{ whiteSpace: "nowrap" }}>
            {percentageLabel(action, t)}
          </Text>
          {/* What the percentage was taken of, which is what makes it checkable. */}
          <Text
            className="font-mono"
            fz={11}
            tt="uppercase"
            lts="0.08em"
            c="var(--color-text-dim)"
            style={{ whiteSpace: "nowrap" }}
          >
            {axisReadingLabel(action, i18n.language, t)}
          </Text>
        </Stack>
      </Group>

      {/* The bar fills towards due and stops there; the number above it carries on past. */}
      <Progress
        value={Math.min(100, action.percentage)}
        size={4}
        radius="xl"
        styles={{ root: { backgroundColor: "var(--color-decor)" }, section: { backgroundColor: color } }}
      />
    </Stack>
  );
}
