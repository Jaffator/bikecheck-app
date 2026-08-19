// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useState, type ReactElement } from "react";
import { Button, Group, Loader, Select, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { tapFeedback } from "@/utils/haptics";
import { useBikes } from "@/features/bikes/bikes.queries";
import { inputStyles, dropdownProps, disabledButtonStyles } from "../add_bike_page/formStyles";
import { usePendingRide, useResolvePendingRide } from "./strava.queries";
import { PendingRideRow } from "./PendingRides";

// The one ride a notification points at: shows what was ridden, then asks the
// only question the app cannot answer itself — which bike it was on.
export function PendingRideDetail(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activityId = "" } = useParams();

  const { data: ride, isLoading, isError } = usePendingRide(activityId);
  const { data: bikes } = useBikes();
  const resolve = useResolvePendingRide();

  const [bikeId, setBikeId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Group justify="center" p="xl">
        <Loader size="sm" />
      </Group>
    );
  }

  // Also the state after someone resolves the ride on another device: the
  // backend serves only unresolved ones, so it is simply gone.
  if (isError || ride === undefined) {
    return (
      <Text size="sm" c="red.5" className="m-3">
        {t("pendingRides.loadFailed")}
      </Text>
    );
  }

  function submit(): void {
    if (bikeId === null) return;
    void tapFeedback();
    resolve.mutate(
      { activityId, bikeId: Number(bikeId) },
      // Back to the queue: with several rides waiting, the next one is the
      // likely next thing to answer.
      { onSuccess: () => navigate("/rides/pending", { replace: true }) },
    );
  }

  return (
    <Stack gap="lg" className="m-3">
      {/* The same row the list draws, so the ride being assigned is visibly the
          one that was tapped. */}
      <PendingRideRow ride={ride} onOpen={() => undefined} />

      <Stack gap="sm">
        <Text fw={600} fz={15} c="text.6">
          {t("pendingRides.chooseBike")}
        </Text>
        <Select
          value={bikeId}
          onChange={setBikeId}
          placeholder={t("pendingRides.chooseBike")}
          data={(bikes ?? []).map((bike) => ({
            value: String(bike.id),
            label: bike.bikename ?? bike.bike_model ?? bike.bike_brand,
          }))}
          styles={inputStyles}
          radius="sm"
          comboboxProps={dropdownProps}
        />
      </Stack>

      {resolve.isError && (
        <Text size="xs" c="red.5">
          {t("pendingRides.assignFailed")}
        </Text>
      )}

      <Button
        fullWidth
        radius="sm"
        loading={resolve.isPending}
        disabled={bikeId === null}
        // The wizard's disabled look: Mantine's own reads as missing rather
        // than blocked on the dark theme.
        styles={disabledButtonStyles}
        style={{ height: "3rem" }}
        onClick={submit}
      >
        {t("pendingRides.assign")}
      </Button>
    </Stack>
  );
}
