// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useState, type ReactElement } from "react";
import { Button, Drawer, Group, Select, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { Clock, Gauge, Mountain } from "lucide-react";
import { tapFeedback } from "@/utils/haptics";
import { useBikes } from "@/features/bikes/bikes.queries";
import { inputStyles, dropdownProps, disabledButtonStyles } from "../add_bike_page/formStyles";
import { useResolvePendingRide } from "./strava.queries";
import type { PendingRide } from "./strava.types";

interface PendingRideSheetProps {
  // The ride being assigned. Null closes the sheet — the caller owns which one
  // is open, because the Pending list and a notification both choose it.
  ride: PendingRide | null;
  onClose: () => void;
}

// Asks the one question the app cannot answer itself: which bike this ride was
// on. Strava either sent no gear, or gear that matches nothing here — the rider
// is not expected to keep gear tidy on Strava's side, so both end up here.
export function PendingRideSheet({ ride, onClose }: PendingRideSheetProps): ReactElement {
  const { t } = useTranslation();
  const { data: bikes } = useBikes();
  const resolve = useResolvePendingRide();

  const [bikeId, setBikeId] = useState<string | null>(null);

  function close(): void {
    // Cleared on the way out, so the next ride does not open with the previous
    // answer already filled in.
    setBikeId(null);
    onClose();
  }

  function submit(): void {
    if (bikeId === null || ride === null) return;
    void tapFeedback();
    resolve.mutate({ activityId: ride.activity_id, bikeId: Number(bikeId) }, { onSuccess: close });
  }

  return (
    <Drawer
      opened={ride !== null}
      onClose={close}
      position="bottom"
      // Height follows the content: one question should not leave half a screen
      // of empty sheet below it.
      size="auto"
      radius="md"
      title={t("pendingRides.chooseBike")}
      // Darkened and blurred so the list behind reads as out of reach while the
      // sheet is up, rather than competing with it for attention.
      overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
      // Keyed by Drawer part, not by CSS property. The header carries its own
      // background, so it has to be painted alongside the content or it stays a
      // light band above the sheet.
      styles={{
        content: { backgroundColor: "var(--mantine-color-cards-6)" },
        header: { backgroundColor: "var(--mantine-color-cards-6)" },
        title: {
          fontWeight: 600,
          color: "var(--mantine-color-text-6)",
          // The close button sits beside it, so centring needs the title to
          // take the full row and centre its own text.
          flex: 1,
          textAlign: "center",
        },
      }}
    >
      <Stack gap="lg" pb="var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px))">
        {/* Which ride is being assigned. A date alone does not tell you that,
            so the figures that identify it come along. */}
        {ride !== null && (
          <Stack gap="xs">
            <Text fw={600} fz={15} c="text.6">
              {dayjs(ride.started_at).format("D. M. YYYY H:mm")}
            </Text>
            <Group gap="lg" wrap="nowrap">
              <Group gap={6} wrap="nowrap">
                <Gauge size={14} color="var(--color-text-dim)" />
                <Text fz={14} c="var(--color-text-dim)">
                  {t("pendingRides.distance", { count: ride.distance_km })}
                </Text>
              </Group>
              <Group gap={6} wrap="nowrap">
                <Clock size={14} color="var(--color-text-dim)" />
                <Text fz={14} c="var(--color-text-dim)">
                  {t("pendingRides.duration", { count: ride.duration_min })}
                </Text>
              </Group>
              <Group gap={6} wrap="nowrap">
                <Mountain size={14} color="var(--color-text-dim)" />
                <Text fz={14} c="var(--color-text-dim)">
                  {t("pendingRides.elevation", { count: ride.elevation_up_m })}
                </Text>
              </Group>
            </Group>
          </Stack>
        )}

        <Select
          value={bikeId}
          onChange={setBikeId}
          placeholder={t("pendingRides.chooseBike")}
          data={(bikes ?? []).map((bike) => ({
            value: String(bike.id),
            label: bike.bikename ?? bike.bike_model ?? bike.bike_brand,
          }))}
          // The wizard's field look, so this reads like any other form field in
          // the app.
          styles={inputStyles}
          radius="sm"
          comboboxProps={dropdownProps}
        />

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
    </Drawer>
  );
}
