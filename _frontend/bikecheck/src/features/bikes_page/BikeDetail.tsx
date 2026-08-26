// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useState, type ReactElement } from "react";
import { Button, Group, Paper, Skeleton, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Clock, Gauge, Plus, Trash2 } from "lucide-react";
import { useBike, useDeleteBike } from "../bikes/bikes.queries";
import { StravaPairingHint } from "../strava/StravaPairingHint";
import { GearLinkingSheet } from "../strava/GearLinkingSheet";
import { useLinkStravaGear } from "../strava/strava.queries";
import { useCurrentUser } from "../users/users.queries";
import { BikePhoto } from "./BikePhoto";
import { bikeTitle } from "../bikes/bikeTitle";
import { ConfirmModal } from "@/components/ConfirmModal";

// Render available identity and totals for the selected bike.
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

  // Show loading state for deep links without cached garage data.
  if (isLoading) {
    return (
      <Stack gap="md" px="md" pt="md">
        {/* Match the photo slot, so the loaded hero lands where the skeleton stood. */}
        <Skeleton radius="md" style={{ aspectRatio: 2 }} />
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

  const title = bikeTitle(bike);

  return (
    <Stack gap="md" px="md" pt="md" pb="calc(2rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))">
      {/* The same slot the garage card uses, so opening a bike keeps the photo
          and its title in place. */}
      <Paper radius="md" style={{ overflow: "hidden" }}>
        <BikePhoto imageUrl={bike.image_url} title={title} subtitle={bike.bikename} titleSize={24} />
      </Paper>

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

      {/* Records work on the bike already being looked at, so the wizard never asks
          which one it was. */}
      <Button
        color="primary.6"
        radius="md"
        leftSection={<Plus size={16} />}
        onClick={() => {
          navigate(`/service/new?bike=${bike.id}`);
        }}
        style={{ alignSelf: "flex-start" }}
      >
        {t("fab.addService")}
      </Button>

      {user?.strava_athlete_id && (
        <Group gap="sm">
          {bike.strava_gear_id === null ? (
            <Button
              variant="light"
              color="strava.6"
              radius="sm"
              onClick={() => {
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
                unpair.mutate([{ bikecheckBikeId: bike.id, stravaBikeId: null }]);
              }}
            >
              {t("strava.unpairBike")}
            </Button>
          )}
        </Group>
      )}

      {/* Existing rides remain after unpairing. */}
      {bike.strava_gear_id !== null && (
        <Text fz={12} c="var(--color-text-dim)">
          {t("strava.unpairBikeNote")}
        </Text>
      )}

      <Text fz={14} c="var(--color-text-dim)">
        {t("bikes.detailComingSoon")}
      </Text>

      <Button
        variant="outline"
        color="red.5"
        radius="md"
        leftSection={<Trash2 size={16} />}
        loading={remove.isPending}
        onClick={() => {
          setConfirmingDelete(true);
        }}
        styles={{
          root: {
            alignSelf: "flex-start",
            backgroundColor: "transparent",
            borderColor: "color-mix(in srgb, var(--mantine-color-red-5) 45%, transparent)",
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

      <GearLinkingSheet opened={pairingGear} onClose={() => setPairingGear(false)} bikeIds={[bike.id]} />

      {/* Confirm irreversible removal from the garage. */}
      <ConfirmModal
        opened={confirmingDelete}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() =>
          remove.mutate(bike.id, {
            // Replace detail history with the garage after deletion.
            onSuccess: () => navigate("/bikes", { replace: true }),
          })
        }
        title={t("bikes.deleteConfirmTitle")}
        body={t("bikes.deleteConfirmBody")}
        cancelLabel={t("bikes.deleteConfirmCancel")}
        confirmLabel={t("bikes.delete")}
        pending={remove.isPending}
      />
    </Stack>
  );
}
