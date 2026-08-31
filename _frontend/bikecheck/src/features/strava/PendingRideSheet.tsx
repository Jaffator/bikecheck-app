// Renders pending ride assignment through query hooks.
import { useState, type ReactElement } from "react";
import { Button, Drawer, Group, Paper, Select, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { ChevronDown, Clock, Mountain, Route } from "lucide-react";
import { RouteMap } from "@/components/RouteMap";
import { useBikes } from "@/features/bikes/bikes.queries";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { inputStyles, dropdownProps, disabledButtonStyles } from "../add_bike_page/formStyles";
import { useResolvePendingRide } from "./strava.queries";
import type { PendingRide } from "./strava.types";

interface PendingRideSheetProps {
  // Selected ride; null closes the sheet.
  ride: PendingRide | null;
  onClose: () => void;
}

// Assigns rides whose Strava gear is missing or cannot be matched.
export function PendingRideSheet({ ride, onClose }: PendingRideSheetProps): ReactElement {
  const { t } = useTranslation();
  const { data: bikes } = useBikes();
  const resolve = useResolvePendingRide();

  const [bikeId, setBikeId] = useState<string | null>(null);

  function close(): void {
    // Clears the previous bike selection before closing.
    setBikeId(null);
    onClose();
  }

  function submit(): void {
    if (bikeId === null || ride === null) return;
    resolve.mutate({ activityId: ride.activity_id, bikeId: Number(bikeId) }, { onSuccess: close });
  }

  return (
    <Drawer
      opened={ride !== null}
      onClose={close}
      position="bottom"
      size="lg"
      radius="md"
      overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
      styles={{
        content: {
          backgroundColor: "var(--mantine-color-cards-6)",
          display: "flex",
          flexDirection: "column",
        },
        body: { flex: 1, display: "flex", flexDirection: "column" },
        header: {
          backgroundColor: "var(--mantine-color-cards-6)",
          marginBottom: "1.5rem",
        },
        // Centers the title against the complete header.
        title: { flex: 1, textAlign: "center", marginInlineStart: "2rem" },
      }}
    >
      <Stack gap={20} h="100%" pb="calc(1rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))">
        <Text fw={900} fz={20} c="text.7" ta="center">
          {t("pendingRides.chooseBikeTitle")}
        </Text>
        {/* Reuses list-card lighting for the selected ride. */}
        {ride !== null && (
          <Paper
            radius="lg"
            p="md"
            style={{
              // Uses separate background fields to preserve the gradient.
              backgroundColor: "var(--mantine-color-cards-6)",
              backgroundImage: "var(--card-glow)",
              border: "1px solid var(--color-border-subtle)",
              boxShadow: "var(--elev-panel)",
            }}
          >
            <Group gap="sm" wrap="nowrap" align="center" w="100%">
              <RouteMap polyline={ride.summary_polyline} width={80} height={80} strokeWidth={3} />
              {/* minWidth enables title line clamping in the flexible column. */}
              <Stack gap="sm" style={{ flex: 1, minWidth: 0 }}>
                <Stack gap={4}>
                  <Text fw={600} fz={15} c="text.6" lineClamp={1}>
                    {ride.name || dayjs(ride.started_at).format("D. M. YYYY")}
                  </Text>
                  <Text fz={13} c="text.7">
                    {dayjs(ride.started_at).format("D. M. YYYY H:mm")}
                  </Text>
                </Stack>
                {/* Distributes metrics evenly across the available width. */}
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
                      {t("pendingRides.elevation", {
                        count: ride.elevation_up_m,
                      })}
                    </Text>
                  </Group>
                </Group>
              </Stack>
            </Group>
          </Paper>
        )}

        {/* Connects the ride summary to its bike-selection field. */}
        <Group justify="center">
          <ChevronDown size={30} color="var(--mantine-color-text-7)" />
        </Group>

        <Select
          onChange={setBikeId}
          placeholder={t("pendingRides.chooseBike")}
          data={(bikes ?? []).map((bike) => ({
            value: String(bike.id),
            label: bikeTitle(bike),
          }))}
          // Adds an edge to the wizard field on the card background.
          styles={{
            input: {
              ...inputStyles.input,
              border: "1px solid var(--mantine-color-cards-4)",
            },
          }}
          radius="md"
          // Matches the dropdown edge to its input field.
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
          // Pins the action to the sheet bottom.
          mt="auto"
          fullWidth
          radius="md"
          loading={resolve.isPending}
          disabled={bikeId === null}
          // Reuses the wizard's dark-theme disabled style.
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
