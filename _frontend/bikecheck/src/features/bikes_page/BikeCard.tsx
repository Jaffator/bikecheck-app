// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { ActionIcon, Box, Group, Image, Paper, Progress, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { StravaPairingHint } from "../strava/StravaPairingHint";
import StravaMark from "@/assets/icons/svg_icons/strava.svg?react";
import { Clock, EllipsisVertical, Gauge } from "lucide-react";
import { tapFeedback } from "@/utils/haptics";
import type { Bike } from "../bikes/bikes.types";
import { PHOTO_SLOT_HEIGHT } from "../add_bike_page/photoCrop";
import { HEALTH_COLORS, overallLevel, type HealthReading } from "./bikeHealth.types";

interface BikeCardProps {
  bike: Bike;
  // Empty until the API serves per-bike wear; the card simply omits the section.
  readings?: HealthReading[];
  onOpen: () => void;
}

// The mark over the photo's bottom corner, saying the bike collects its rides
// from Strava. Only the linked state shows: an unpaired bike already says so in
// its stats, and a badge for it here would put a nothing-to-see label on most
// of the garage. Dark pill like the health badge, so both read over any photo.
function StravaLinkedBadge({ stravaGearId }: { stravaGearId: string | null }): ReactElement | null {
  const { t } = useTranslation();

  if (stravaGearId === null) return null;

  return (
    <Group
      // Padding, gap and type size all match HealthBadge: the two sit stacked
      // in the same corner, so any difference reads as one of them being wrong
      // rather than as a distinction worth making.
      gap={5}
      px={8}
      py={3}
      style={{
        borderRadius: "9999px",
        backgroundColor: "rgba(20, 20, 20, 0.75)",
        border: "1px solid color-mix(in srgb, var(--mantine-color-strava-6) 55%, transparent)",
        backdropFilter: "blur(4px)",
      }}
    >
      {/* The mark is boxed to the health dot's size, so the taller glyph does
          not push this pill past the one above it. */}
      <StravaMark width={10} height={10} color="var(--mantine-color-strava-6)" style={{ display: "block", flexShrink: 0 }} />
      <Text className="font-mono" fz={10} c="var(--mantine-color-strava-6)">
        {t("strava.paired")}
      </Text>
    </Group>
  );
}

// The pill over the photo, reporting the bike as a whole.
function HealthBadge({ readings }: { readings: HealthReading[] }): ReactElement {
  const { t } = useTranslation();
  const level = overallLevel(readings);
  const color = HEALTH_COLORS[level];

  return (
    <Group
      gap={5}
      px={8}
      py={3}
      style={{
        borderRadius: "9999px",
        backgroundColor: "rgba(20, 20, 20, 0.75)",
        border: `1px solid ${color}`,
        backdropFilter: "blur(4px)",
      }}
    >
      <Box w={6} h={6} style={{ borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
      <Text className="font-mono" fz={10} c={color}>
        {t(`bikes.health.${level}`)}
      </Text>
    </Group>
  );
}

// One wear reading: label, its own figure, and how much is left.
function HealthBar({ reading }: { reading: HealthReading }): ReactElement {
  const { t } = useTranslation();
  const color = HEALTH_COLORS[reading.level];

  return (
    <Stack gap={6}>
      <Group justify="space-between" wrap="nowrap" gap="sm">
        <Text className="font-mono" fz={10} tt="uppercase" c="var(--color-text-dim)" style={{ letterSpacing: "0.05em" }}>
          {t(reading.labelKey)}
        </Text>
        <Text
          className="font-mono"
          fz={10}
          tt="uppercase"
          ta="right"
          // A good reading states a fact and stays quiet; anything worse is the
          // point of the row, so it takes the colour.
          c={reading.level === "good" ? "var(--color-text-dim)" : color}
          style={{ letterSpacing: "0.05em" }}
        >
          {reading.value}
        </Text>
      </Group>
      <Progress
        value={reading.fill * 100}
        size={6}
        radius="xl"
        styles={{
          root: { backgroundColor: "var(--color-decor)" },
          section: { backgroundColor: color },
        }}
      />
    </Stack>
  );
}

export function BikeCard({ bike, readings = [], onOpen }: BikeCardProps): ReactElement {
  const { t } = useTranslation();

  // The user's own name wins; a bike saved without one is known by its model.
  const title = bike.bikename ?? bike.bike_model ?? bike.bike_brand;
  // "Road · Carbon" — whichever of the two the bike actually carries.
  const subtitle = [bike.bike_model === title ? null : bike.bike_brand, bike.frame_material]
    .filter((part): part is string => part !== null && part !== "")
    .join(" • ");

  return (
    <Paper
      bg="cards.6"
      radius="md"
      // The whole card opens the bike, not just the photo: everything on it
      // describes the one bike, so every part of it is the same target. The
      // menu button inside stops the event rather than being carved out.
      onClick={() => {
        tapFeedback();
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
        border: "1px solid var(--color-border-subtle)",
        // Answers the tap before the next screen arrives, so the press never
        // feels like it went nowhere.
        transition: "transform 0.12s ease",
        cursor: "pointer",
      }}
      // Tailwind's active: variant handles the pressed state without tracking it.
      className="active:scale-[0.985]"
    >
      {/* ----------- Photo, with the overall verdict over it ----------- */}
      {/* Positioned only so the health badge and the Strava mark can sit over
          it; the card above carries the tap. */}
      <Box style={{ position: "relative" }}>
        {bike.image_url ? (
          <Image
            src={bike.image_url}
            alt={title}
            h={PHOTO_SLOT_HEIGHT}
            // Photos are cropped to the slot's shape on upload, so filling it
            // costs only the rounding between that crop and the rendered width
            // — and leaves none of the white edge contain used to show.
            fit="cover"
            // A garage of cards would otherwise fetch every photo at once on a
            // phone connection; only the ones being scrolled to are needed.
            loading="lazy"
            // Reserves the slot before the photo arrives so the list does not
            // jump as each one loads in.
            style={{ backgroundColor: "#FFFFFF" }}
          />
        ) : (
          // No photo: the slot keeps its height so a garage of cards stays even.
          <Box
            h={PHOTO_SLOT_HEIGHT}
            bg="cards.7"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Gauge size={32} color="var(--mantine-color-text-9)" />
          </Box>
        )}
        {/* Stacked in the photo's top right corner, verdict first: both are
            badges about the bike as a whole, so they read as one column rather
            than two things pinned to opposite corners. Right-aligned so their
            differing widths still share an edge. */}
        <Stack gap={6} align="flex-end" style={{ position: "absolute", top: "0.75rem", right: "0.75rem" }}>
          <HealthBadge readings={readings} />
          <StravaLinkedBadge stravaGearId={bike.strava_gear_id} />
        </Stack>
      </Box>

      {/* ----------- Identity, totals and wear ----------- */}
      <Stack gap="sm" p="md">
        <Group justify="space-between" wrap="nowrap" align="flex-start" gap="sm">
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Text fw={700} fz={20} c="text.6" lh={1.2}>
              {title}
            </Text>
            {subtitle !== "" && (
              <Text className="font-mono" fz={11} tt="uppercase" c="var(--color-text-dim)">
                {subtitle}
              </Text>
            )}
          </Stack>

          {/* Per-bike actions land here once there are any; the button is the
              design's own affordance for them. */}
          <ActionIcon
            variant="transparent"
            color="gray"
            aria-label={t("bikes.cardMenu")}
            // The card behind it opens the bike; its own actions are its own.
            onClick={(event) => event.stopPropagation()}
            disabled
            // Mantine paints a disabled control its own grey plate, which reads
            // as a hole in the card. The glyph alone carries the affordance.
            styles={{
              root: {
                backgroundColor: "transparent",
                border: "none",
              },
            }}
          >
            <EllipsisVertical size={18} />
          </ActionIcon>
        </Group>

        <Group gap="lg" wrap="nowrap">
          <Group gap={6} wrap="nowrap">
            <Gauge size={14} color="var(--color-text-dim)" />
            <Text fz={15} c="text.6">
              {t("bikes.kilometres", { count: bike.total_km ?? 0 })}
            </Text>
          </Group>
          <Group gap={6} wrap="nowrap">
            <Clock size={14} color="var(--color-text-dim)" />
            <Text fz={15} c="text.6">
              {t("bikes.hours", {
                count: Math.round((bike.total_time_min ?? 0) / 60),
              })}
            </Text>
          </Group>
          <StravaPairingHint stravaGearId={bike.strava_gear_id} />
        </Group>

        {readings.length > 0 && (
          <Stack gap="xs" pt={4}>
            {readings.map((reading) => (
              <HealthBar key={reading.labelKey} reading={reading} />
            ))}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
