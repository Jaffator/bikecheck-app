// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { ActionIcon, Box, Group, Image, Paper, Progress, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Clock, EllipsisVertical, Gauge } from "lucide-react";
import { tapFeedback } from "@/utils/haptics";
import type { Bike } from "../bikes/bikes.types";
import { HEALTH_COLORS, overallLevel, type HealthReading } from "./bikeHealth.types";

interface BikeCardProps {
  bike: Bike;
  // Empty until the API serves per-bike wear; the card simply omits the section.
  readings?: HealthReading[];
  onOpen: () => void;
}

// The pill over the photo, reporting the bike as a whole.
function HealthBadge({ readings }: { readings: HealthReading[] }): ReactElement {
  const { t } = useTranslation();
  const level = overallLevel(readings);
  const color = HEALTH_COLORS[level];

  return (
    <Group
      gap={6}
      px={10}
      py={5}
      style={{
        borderRadius: "9999px",
        backgroundColor: "rgba(20, 20, 20, 0.75)",
        border: `1px solid ${color}`,
        backdropFilter: "blur(4px)",
      }}
    >
      <Box w={7} h={7} style={{ borderRadius: "50%", backgroundColor: color }} />
      <Text className="font-mono" fz={11} c={color}>
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
        styles={{ root: { backgroundColor: "var(--color-decor)" }, section: { backgroundColor: color } }}
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
      style={{
        overflow: "hidden",
        border: "1px solid var(--color-border-subtle)",
        // Answers the tap before the next screen arrives, so the press never
        // feels like it went nowhere.
        transition: "transform 0.12s ease",
      }}
      // Tailwind's active: variant handles the pressed state without tracking it.
      className="active:scale-[0.985]"
    >
      {/* ----------- Photo, with the overall verdict over it ----------- */}
      {/* The whole photo opens the bike, so a thumb has the largest possible
          target; the menu button below stops short of it. */}
      <UnstyledButton
        onClick={() => {
          tapFeedback();
          onOpen();
        }}
        style={{ display: "block", width: "100%", position: "relative" }}
      >
        {bike.image_url ? (
          <Image
            src={bike.image_url}
            alt={title}
            h={180}
            // Product shots are wide and framed with their own margins, so
            // cropping to fill cut the ends off the bike. Contained: the whole
            // bike is visible and the slot's own colour fills what is left.
            fit="contain"
            // A garage of cards would otherwise fetch every photo at once on a
            // phone connection; only the ones being scrolled to are needed.
            loading="lazy"
            // Reserves the slot before the photo arrives so the list does not
            // jump as each one loads in, and fills the letterbox a contained
            // photo leaves. White to match the background baked into stored
            // images, so the photo has no visible edge of its own.
            style={{ backgroundColor: "#FFFFFF" }}
          />
        ) : (
          // No photo: the slot keeps its height so a garage of cards stays even.
          <Box h={180} bg="cards.7" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Gauge size={32} color="var(--mantine-color-text-9)" />
          </Box>
        )}
        <Box style={{ position: "absolute", top: "0.75rem", right: "0.75rem" }}>
          <HealthBadge readings={readings} />
        </Box>
      </UnstyledButton>

      {/* ----------- Identity, totals and wear ----------- */}
      <Stack gap="sm" p="md">
        <Group justify="space-between" wrap="nowrap" align="flex-start" gap="sm">
          <UnstyledButton
            onClick={() => {
              tapFeedback();
              onOpen();
            }}
            style={{ minWidth: 0, textAlign: "left" }}
          >
            <Stack gap={2}>
              <Text fw={700} fz={20} c="text.6" lh={1.2}>
                {title}
              </Text>
              {subtitle !== "" && (
                <Text className="font-mono" fz={11} tt="uppercase" c="var(--color-text-dim)">
                  {subtitle}
                </Text>
              )}
            </Stack>
          </UnstyledButton>

          {/* Per-bike actions land here once there are any; the button is the
              design's own affordance for them. */}
          <ActionIcon variant="subtle" color="gray" radius="xl" aria-label={t("bikes.cardMenu")} disabled>
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
              {t("bikes.hours", { count: Math.round((bike.total_time_min ?? 0) / 60) })}
            </Text>
          </Group>
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
