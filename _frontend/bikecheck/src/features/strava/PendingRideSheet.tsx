// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useState, type ReactElement } from "react";
import { Button, Drawer, Group, Paper, Select, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { ChevronDown, Clock, Mountain, Route } from "lucide-react";
import { tapFeedback } from "@/utils/haptics";
import { RouteMap } from "@/components/RouteMap";
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
      size="lg"
      radius="md"
      // Names the sheet for both the reader and the screen reader.
      // title={
      //   <Text fw={600} fz={16} c="text.7">
      //     {t("pendingRides.chooseBikeTitle")}
      //   </Text>
      // }
      overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
      styles={{
        content: {
          backgroundColor: "var(--mantine-color-cards-6)",
          display: "flex",
          flexDirection: "column",
        },
        body: { flex: 1, display: "flex", flexDirection: "column" },
        header: { backgroundColor: "var(--mantine-color-cards-6)", marginBottom: "1.5rem" },
        // The close button keeps its corner, so the title is centred against
        // the whole header rather than against the space left over beside it.
        title: { flex: 1, textAlign: "center", marginInlineStart: "2rem" },
      }}
    >
      <Stack gap={20} h="100%" pb="calc(1rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))">
        <Text fw={900} fz={20} c="text.7" ta="center">
          {t("pendingRides.chooseBikeTitle")}
        </Text>
        {/* The row the user tapped, carried into the sheet as the same card —
            same lighting as the list, so opening one enlarges the thing rather
            than replacing it with a loose block of text. */}
        {ride !== null && (
          <Paper
            radius="lg"
            p="md"
            style={{
              // Colour, glow and inner edge all live in this one object: `bg`
              // would emit the `background` shorthand and wipe the gradient.
              backgroundColor: "var(--mantine-color-cards-6)",
              backgroundImage:
                "radial-gradient(90% 120% at 0% 0%, color-mix(in srgb, var(--mantine-color-primary-6) 7%, transparent) 0%, transparent 45%)",
              border: "1px solid var(--color-border-subtle)",
              boxShadow:
                "inset 0 1px 0 0 rgba(255, 255, 255, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.35), 0 8px 16px -6px rgba(0, 0, 0, 0.5)",
            }}
          >
            <Group gap="sm" wrap="nowrap" align="center" w="100%">
              <RouteMap polyline={ride.summary_polyline} width={80} height={80} strokeWidth={3} />
              {/* minWidth lets the column shrink below its content, without which
                  the title's lineClamp has nothing to clamp against. */}
              <Stack gap="sm" style={{ flex: 1, minWidth: 0 }}>
                <Stack gap={4}>
                  <Text fw={600} fz={15} c="text.6" lineClamp={1}>
                    {ride.name || dayjs(ride.started_at).format("D. M. YYYY")}
                  </Text>
                  <Text fz={13} c="text.7">
                    {dayjs(ride.started_at).format("D. M. YYYY H:mm")}
                  </Text>
                </Stack>
                {/* The three metrics spread across whatever width the column
                    has, so they stay evenly spaced instead of bunching up on
                    the left at wider sizes. */}
                <Group justify="space-between" wrap="nowrap" w="90%" style={{ flexShrink: 0 }}>
                  <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                    <Route size={14} color="var(--mantine-color-text-7)" />
                    <Text fz={14} c="text.7" style={{ whiteSpace: "nowrap" }}>
                      {t("pendingRides.distance", { count: ride.distance_km })}
                    </Text>
                  </Group>
                  <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                    <Clock size={14} color="var(--mantine-color-text-7)" />
                    <Text fz={14} c="text.7" style={{ whiteSpace: "nowrap" }}>
                      {t("pendingRides.duration", { count: ride.duration_min })}
                    </Text>
                  </Group>
                  <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                    <Mountain size={14} color="var(--mantine-color-text-7)" />
                    <Text fz={14} c="text.7" style={{ whiteSpace: "nowrap" }}>
                      {t("pendingRides.elevation", { count: ride.elevation_up_m })}
                    </Text>
                  </Group>
                </Group>
              </Stack>
            </Group>
          </Paper>
        )}

        {/* Points from the ride to the field that answers it, so the sheet
            reads as one question rather than two stacked blocks. */}
        <Group justify="center">
          <ChevronDown size={30} color="var(--mantine-color-text-7)" />
        </Group>

        <Select
          onChange={setBikeId}
          placeholder={t("pendingRides.chooseBike")}
          data={(bikes ?? []).map((bike) => ({
            value: String(bike.id),
            label: bike.bikename ?? bike.bike_model ?? bike.bike_brand,
          }))}
          // The wizard's field look, given an edge of its own: on the sheet's
          // card background a borderless input has nothing to read against.
          styles={{ input: { ...inputStyles.input, border: "1px solid var(--mantine-color-cards-4)" } }}
          radius="md"
          // The shared dropdown look, with the same edge as the field above it
          // so the open menu reads as an extension of it.
          comboboxProps={{
            ...dropdownProps,
            styles: {
              dropdown: {
                ...dropdownProps.styles.dropdown,
                border: "1px solid var(--mantine-color-cards-4)",
              },
            },
          }}
        />

        {resolve.isError && (
          <Text size="xs" c="red.5">
            {t("pendingRides.assignFailed")}
          </Text>
        )}

        <Button
          // Sits on the sheet's bottom edge whatever the content above it does.
          mt="auto"
          fullWidth
          radius="md"
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
