// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { Group, Paper, Progress, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Clock, Mountain, Route, type LucideIcon } from "lucide-react";
import { StravaPairingHint } from "@/features/strava/ui/StravaPairingHint";
import type { ListedBike } from "@/features/bikes/bikes.types";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { bikeFigures } from "@/features/bikes/bikeFigures";
import { lastRideDate } from "@/features/bikes/lastRideDate";
import { BikePhoto } from "./BikePhoto";
import { BikeShareMarks } from "./BikeShareMarks";
import { attentionColor, barFill, QUIET_BELOW, worstAction } from "@/features/service_tracking/attentionLevel";
import { useBikeTrackedActions } from "@/features/service_tracking/tracking.queries";
import type { TrackedAction } from "@/features/service_tracking/tracking.types";
import { catalogueLabel } from "@/features/service/serviceLabels";
import { HealthBadge } from "@/features/service_tracking/ui/HealthBadge";
import { StravaLinkedBadge } from "@/features/strava/ui/StravaLinkedBadge";
import { formatNumber } from "@/utils/number";

interface BikeCardProps {
  bike: ListedBike;
  onOpen: () => void;
}

// One figure on the data line; the icon names what it counts.
function Reading({ icon: Icon, value }: { icon: LucideIcon; value: string }): ReactElement {
  return (
    <Group gap={6} wrap="nowrap">
      <Icon size={15} color="var(--color-text-dim)" aria-hidden />
      <Text className="tabular-nums" fz={15} fw={600} lh="20px" c="text.6" style={{ whiteSpace: "nowrap" }}>
        {value}
      </Text>
    </Group>
  );
}

// The part that needs attention first: the job and its percentage over a bar as wide as the
// card, so the three read as one. The percentage rather than the figures behind it - a wear
// index has no unit to make "133 / 600" mean anything here.
function AttentionMeter({ action }: { action: TrackedAction }): ReactElement {
  const { t } = useTranslation();
  const color = attentionColor(action.percentage);

  return (
    <Stack gap={6}>
      <Group justify="space-between" wrap="nowrap" gap="sm">
        <Text fz={12} c="text.8" lineClamp={1}>
          {catalogueLabel(action.action_i18n_key, action.action_name, t)}
        </Text>
        <Text
          className="tabular-nums"
          fz={12}
          fw={500}
          // Emphasize a reading the ramp has started to warm.
          c={action.percentage < QUIET_BELOW ? "text.8" : color}
          style={{ whiteSpace: "nowrap" }}
        >
          {t("tracking.percentage", { value: action.percentage })}
        </Text>
      </Group>
      <Progress
        value={barFill(action) * 100}
        size={5}
        radius="xl"
        styles={{ section: { backgroundColor: color } }}
      />
    </Stack>
  );
}

export function BikeCard({ bike, onOpen }: BikeCardProps): ReactElement {
  const { t, i18n } = useTranslation();
  // The card reads its own bike's Service Tracking: the badge over the photo and the meter
  // below it are two views of one answer, so they come from one request.
  const { data: actions } = useBikeTrackedActions(bike.id);

  const title = bikeTitle(bike);
  // The garage leads with the part that needs attention first; the whole list is on the
  // bike's own page.
  const worst = worstAction(actions ?? []);
  // Three zeros read as a broken card, not as a bike that has not ridden yet. A bike with
  // nothing on the clock shows only where its figures would come from.
  const figures = bikeFigures(bike);
  const hasFigures = figures.km > 0 || figures.elevationM > 0 || figures.timeMin > 0;

  return (
    <Paper
      radius="lg"
      // Open bike details from the entire card.
      onClick={() => {
        onOpen();
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        // Space would scroll the garage instead of opening the bike.
        event.preventDefault();
        onOpen();
      }}
      style={{
        overflow: "hidden",
        // `bg` would emit the `background` shorthand - see docs/ui/card-surface.md.
        backgroundColor: "var(--mantine-color-cards-6)",
        // The hairline every card wears, so the edge does not dissolve into the page.
        border: "1px solid var(--mantine-color-cards-5)",
        // Same three-part shadow the other cards use, one step deeper because this card is
        // the largest on the screen.
        boxShadow: "var(--elev-hero)",
        // Animate tap feedback before navigation.
        transition: "transform 0.12s ease, box-shadow 0.12s ease",
        cursor: "pointer",
        position: "relative",
      }}
      // Tailwind's active: variant handles the pressed state without tracking it.
      className="bike-card hover-veil active:scale-[0.985]"
    >
      {/* The photo carries the name: the gradient that evens the photos out is already
          there, and the card below it is left to the numbers. */}
      <BikePhoto imageUrl={bike.image_url} title={title} subtitle={bike.bikename} titleSize={20}>
        {/* Stack overall bike badges in the photo's bottom corner. */}
        <Stack gap={6} align="flex-end">
          <BikeShareMarks bike={bike} />
          <HealthBadge actions={actions ?? []} />
          <StravaLinkedBadge stravaGearId={bike.strava_gear_id} />
        </Stack>
      </BikePhoto>

      <Stack gap="sm" px="md" py="sm" style={{ position: "relative", zIndex: 2 }}>
        {/* The three readings a bike keeps by itself, in the order the bike's own page
            gives them, from one edge of the card to the other. */}
        {hasFigures ? (
          <Group justify="space-between" wrap="nowrap" gap="sm">
            <Reading icon={Route} value={`${formatNumber(figures.km, i18n.language)} km`} />
            <Reading icon={Mountain} value={`${formatNumber(figures.elevationM, i18n.language)} m`} />
            <Reading
              icon={Clock}
              value={`${formatNumber(Math.round(figures.timeMin / 60), i18n.language)} h`}
            />
          </Group>
        ) : (
          <Text fz={13} c="text.8">
            {t("bikes.noRidesYet")}
          </Text>
        )}

        {/* A bike whose worst reading is still 0% has nothing to report: the meter would
            say so with an empty bar and a zero, which is a line of card spent on nothing. */}
        {worst !== null && worst.percentage > 0 && <AttentionMeter action={worst} />}

        {/* Plain, because a Mantine Group would beat `empty:hidden`: with neither child the row takes no gap. */}
        <div className="flex items-center justify-between gap-3 empty:hidden">
          {/* The figures line already says there are no rides yet. */}
          {bike.last_ride_at !== null && (
            <Text className="tabular-nums" fz={12} c="text.8" style={{ whiteSpace: "nowrap" }}>
              {t("bikes.lastRide", { date: lastRideDate(bike.last_ride_at) })}
            </Text>
          )}
          <StravaPairingHint bikeId={bike.id} stravaGearId={bike.strava_gear_id} />
        </div>
      </Stack>
    </Paper>
  );
}
