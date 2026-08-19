// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useState, type ReactElement } from "react";
import {
  Button,
  Group,
  Image,
  Modal,
  Paper,
  Skeleton,
  Stack,
  Text,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Clock, Gauge, Trash2 } from "lucide-react";
import { useBike, useDeleteBike } from "../bikes/bikes.queries";
import { StravaPairingHint } from "../strava/StravaPairingHint";
import { GearLinkingSheet } from "../strava/GearLinkingSheet";
import { useLinkStravaGear } from "../strava/strava.queries";
import { useCurrentUser } from "../users/users.queries";
import { tapFeedback } from "@/utils/haptics";
import { PHOTO_SLOT_HEIGHT } from "../add_bike_page/photoCrop";

// The bike a card opens. Identity and totals only so far — components, service
// history and wear are still to come.
export function BikeDetail(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: bike, isLoading, isError } = useBike(Number(id));
  const { data: user } = useCurrentUser();
  const [pairingGear, setPairingGear] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const remove = useDeleteBike();
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
          {/* Same slot height and fit as the card, so opening a bike shows the
              photo framed exactly as the garage showed it. */}
          <Image
            src={bike.image_url}
            alt={title}
            h={PHOTO_SLOT_HEIGHT}
            fit="cover"
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

      {/* Last thing on the page: destructive, and nothing above it should be
          reached by aiming for something else. */}
      <Button
        variant="outline"
        color="red.5"
        radius="md"
        leftSection={<Trash2 size={16} />}
        loading={remove.isPending}
        onClick={() => {
          void tapFeedback();
          setConfirmingDelete(true);
        }}
        styles={{
          root: {
            alignSelf: "flex-start",
            backgroundColor: "transparent",
            borderColor:
              "color-mix(in srgb, var(--mantine-color-red-5) 45%, transparent)",
          },
        }}
      >
        {t("bikes.delete")}
      </Button>

      {remove.isError && (
        <Text size="xs" c="red.5">
          {t("bikes.deleteFailed")}
        </Text>
      )}

      <GearLinkingSheet
        opened={pairingGear}
        onClose={() => setPairingGear(false)}
        bikeIds={[bike.id]}
      />

      {/* The bike leaves the garage for good, so it is worth one question. The
          body says what survives it: the rides stay in the history. */}
      <Modal
        opened={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        title={t("bikes.deleteConfirmTitle")}
        centered
        radius="md"
        styles={{
          content: { backgroundColor: "var(--mantine-color-cards-6)" },
          header: { backgroundColor: "var(--mantine-color-cards-6)" },
          title: { fontWeight: 600, color: "var(--mantine-color-text-6)" },
        }}
      >
        <Stack gap="lg">
          <Text
            size="sm"
            c="var(--color-text-dim)"
            style={{ lineHeight: 1.45 }}
          >
            {t("bikes.deleteConfirmBody")}
          </Text>

          <Group gap="sm" grow>
            <Button
              variant="default"
              radius="md"
              onClick={() => setConfirmingDelete(false)}
              disabled={remove.isPending}
            >
              {t("bikes.deleteConfirmCancel")}
            </Button>
            <Button
              color="red.5"
              radius="md"
              loading={remove.isPending}
              onClick={() => {
                void tapFeedback();
                remove.mutate(bike.id, {
                  // Nothing to come back to once the bike is gone, so the garage
                  // replaces this screen rather than sitting behind it.
                  onSuccess: () => navigate("/bikes", { replace: true }),
                });
              }}
            >
              {t("bikes.delete")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
