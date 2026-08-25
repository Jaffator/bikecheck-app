// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { ActionIcon, Box, Group, Image, Paper, Progress, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { StravaPairingHint } from "../strava/StravaPairingHint";
import StravaMark from "@/assets/icons/svg_icons/strava.svg?react";
import { Clock, EllipsisVertical, Gauge } from "lucide-react";
import type { Bike } from "../bikes/bikes.types";
import { PHOTO_SLOT_HEIGHT } from "../add_bike_page/photoCrop";
import { HEALTH_COLORS, overallLevel, type HealthReading } from "./bikeHealth.types";

interface BikeCardProps {
  bike: Bike;
  // Empty until the API serves per-bike wear; the card simply omits the section.
  readings?: HealthReading[];
  onOpen: () => void;
}

// Render the Strava badge for bikes linked to Strava gear.
function StravaLinkedBadge({ stravaGearId }: { stravaGearId: string | null }): ReactElement | null {
  const { t } = useTranslation();

  if (stravaGearId === null) return null;

  return (
    <Group
      // Match health badge dimensions when badges stack.
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
          // Emphasize non-good health readings.
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
        border: "1px solid var(--color-border-subtle)",
        // Same three-part shadow the other cards use, one step deeper because
        // this card is the largest: a hairline of light along the top edge, a
        // tight contact shadow, and a soft cast one that lifts it off the page.
        boxShadow:
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.4), 0 12px 24px -8px rgba(0, 0, 0, 0.55)",
        // Animate tap feedback before navigation.
        transition: "transform 0.12s ease, box-shadow 0.12s ease",
        cursor: "pointer",
        position: "relative",
      }}
      // Tailwind's active: variant handles the pressed state without tracking it.
      className="bike-card active:scale-[0.985]"
    >
      {/* Its own layer rather than a background on the card: the photo and the
          content sit on their own opaque backgrounds and would paint over a
          card-level gradient, leaving only a sliver of it visible. */}
      <Box
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
          background:
            "radial-gradient(120% 90% at 0% 100%, color-mix(in srgb, var(--mantine-color-primary-6) 12%, transparent) 0%, transparent 55%)",
        }}
      />

      {/* Position bike badges over the photo. */}
      <Box
        style={{
          position: "relative",
          // A shadow cast down from the photo's edge, so the content below reads
          // as a recessed surface instead of a flat continuation of the image.
          boxShadow: "0 6px 12px -6px rgba(0, 0, 0, 0.6)",
        }}
      >
        {bike.image_url ? (
          <Image
            src={bike.image_url}
            alt={title}
            h={PHOTO_SLOT_HEIGHT}
            // Fill the slot with the upload-cropped photo.
            fit="cover"
            // Load card images as they enter the viewport.
            loading="lazy"
            style={{ backgroundColor: "#FFFFFF" }}
          />
        ) : (
          // Preserve card height when no photo is available.
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
        {/* Stack overall bike badges in the photo corner. */}
        <Stack gap={6} align="flex-end" style={{ position: "absolute", top: "0.75rem", right: "0.75rem" }}>
          <HealthBadge readings={readings} />
          <StravaLinkedBadge stravaGearId={bike.strava_gear_id} />
        </Stack>
      </Box>

      <Stack gap="sm" p="md" style={{ position: "relative", zIndex: 2 }}>
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

          <ActionIcon
            variant="transparent"
            color="gray"
            aria-label={t("bikes.cardMenu")}
            // The card behind it opens the bike; its own actions are its own.
            onClick={(event) => event.stopPropagation()}
            disabled
            // Keep the disabled action icon visually unobtrusive.
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
