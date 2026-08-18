// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useState, type ReactElement } from "react";
import {
  Button,
  Group,
  Image,
  Paper,
  Skeleton,
  Stack,
  Text,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { Clock, Gauge } from "lucide-react";
import { useBike } from "../bikes/bikes.queries";
import { StravaPairingHint } from "../strava/StravaPairingHint";
import { GearLinkingSheet } from "../strava/GearLinkingSheet";
import { useLinkStravaGear } from "../strava/strava.queries";
import { useCurrentUser } from "../users/users.queries";
import { tapFeedback } from "@/utils/haptics";

// The bike a card opens. Identity and totals only so far — components, service
// history and wear are still to come.
export function BikeDetail(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { data: bike, isLoading, isError } = useBike(Number(id));
  const { data: user } = useCurrentUser();
  const [pairingGear, setPairingGear] = useState(false);
  const unpair = useLinkStravaGear();

  // Only reached when the bike was opened without the garage list in cache (a
  // deep link or a reload); coming from the list, the data is already there.
  if (isLoading) {
    return (
      <Stack gap="md" px="md" pt="md">
        <Skeleton h={220} radius="md" />
        <Skeleton h={28} w="60%" radius="sm" />
        <Skeleton h={18} w="40%" radius="sm" />
      </Stack>
    );
  }

  if (isError || !bike) {
    return (
      <Text m="md" c="red">
        {t("bikes.loadFailed")}
      </Text>
    );
  }

  const title = bike.bikename ?? bike.bike_model ?? bike.bike_brand;

  return (
    <Stack
      gap="md"
      px="md"
      pt="md"
      pb="calc(2rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))"
    >
      {bike.image_url && (
        <Paper radius="md" style={{ overflow: "hidden" }}>
          {/* Contained on white for the same reason as the card: product shots
              carry their own margins, and cropping to fill cut the bike off. */}
          <Image
            src={bike.image_url}
            alt={title}
            h={220}
            fit="contain"
            bg="#FFFFFF"
          />
        </Paper>
      )}

      <Stack gap={4}>
        <Text fw={700} fz={24} c="text.6" lh={1.2}>
          {title}
        </Text>
        <Text
          className="font-mono"
          fz={11}
          tt="uppercase"
          c="var(--color-text-dim)"
        >
          {[bike.bike_brand, bike.year]
            .filter((part) => part !== null && part !== "")
            .join(" • ")}
        </Text>
      </Stack>

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

      {/* Pairing is only ever offered with a linked account — without one there
          is no gear to pair against. */}
      {user?.strava_athlete_id && (
        <Group gap="sm">
          {bike.strava_gear_id === null ? (
            <Button
              variant="light"
              color="strava.6"
              radius="sm"
              onClick={() => {
                void tapFeedback();
                setPairingGear(true);
              }}
            >
              {t("strava.pairBike")}
            </Button>
          ) : (
            <Button
              variant="outline"
              color="red"
              radius="sm"
              loading={unpair.isPending}
              onClick={() => {
                void tapFeedback();
                unpair.mutate([
                  { bikecheckBikeId: bike.id, stravaBikeId: null },
                ]);
              }}
            >
              {t("strava.unpairBike")}
            </Button>
          )}
        </Group>
      )}

      {/* Unpairing stops new rides from arriving; the ones already recorded stay,
          because component wear is derived from them. */}
      {bike.strava_gear_id !== null && (
        <Text fz={12} c="var(--color-text-dim)">
          {t("strava.unpairBikeNote")}
        </Text>
      )}

      <Text fz={14} c="var(--color-text-dim)">
        {t("bikes.detailComingSoon")}
      </Text>

      <GearLinkingSheet
        opened={pairingGear}
        onClose={() => setPairingGear(false)}
        bikeIds={[bike.id]}
      />
    </Stack>
  );
}
