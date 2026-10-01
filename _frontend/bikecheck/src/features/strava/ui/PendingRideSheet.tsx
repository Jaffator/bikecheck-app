// Renders pending ride assignment through query hooks.
import { useState, type ReactElement } from "react";
import { Button, Group, Paper, Select, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { Ban, ChevronDown, Clock, Mountain, Route } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { RouteMap } from "@/components/RouteMap";
import { useBikes } from "@/features/bikes/bikes.queries";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { inputStyles, dropdownProps, disabledButtonStyles } from "@/features/add_bike_page/formStyles";
import { useDismissPendingRide, useResolvePendingRide } from "@/features/strava/strava.queries";
import type { PendingRide } from "@/features/strava/strava.types";
import { formatDuration } from "@/features/rides/rideDuration";

// Mantine's large sheet; the assign button is pinned to its foot.
const SHEET_HEIGHT = "var(--drawer-size-lg)";

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
  const dismiss = useDismissPendingRide();
  const [confirmingDismiss, setConfirmingDismiss] = useState(false);

  // The bike is chosen for one ride: on desktop the panel can be switched to another while open.
  const [choice, setChoice] = useState<{ activityId: string; bikeId: string } | null>(null);
  const bikeId = choice !== null && choice.activityId === ride?.activity_id ? choice.bikeId : null;

  function close(): void {
    // Clears the previous bike selection before closing.
    setChoice(null);
    onClose();
  }

  function cancelDismiss(): void {
    dismiss.reset();
    setConfirmingDismiss(false);
  }

  function confirmDismiss(): void {
    if (ride === null) return;
    dismiss.mutate(ride.activity_id, {
      onSuccess: () => {
        setConfirmingDismiss(false);
        close();
      },
    });
  }

  function choose(value: string | null): void {
    setChoice(value === null || ride === null ? null : { activityId: ride.activity_id, bikeId: value });
  }

  function submit(): void {
    if (bikeId === null || ride === null) return;
    resolve.mutate({ activityId: ride.activity_id, bikeId: Number(bikeId) }, { onSuccess: close });
  }

  return (
    <ResponsiveSheet
      opened={ride !== null}
      onClose={close}
      desktop="panel"
      styles={{
        content: {
          height: SHEET_HEIGHT,
          display: "flex",
          flexDirection: "column",
        },
        body: { flex: 1, display: "flex", flexDirection: "column" },
        header: { marginBottom: "1.5rem" },
        // Centers the title against the complete header.
        title: { flex: 1, textAlign: "center", marginInlineStart: "2rem" },
      }}
    >
      <Stack gap={20} h="100%" pb="calc(1rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))">
        <Text fw={700} fz={20} c="text.7" ta="center">
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
                      {formatDuration(ride.duration_min)}
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
          value={bikeId}
          onChange={choose}
          placeholder={t("pendingRides.chooseBike")}
          data={(bikes ?? []).map((bike) => ({
            value: String(bike.id),
            label: bikeTitle(bike),
          }))}
          styles={inputStyles}
          radius="md"
          // A portalled dropdown made the whole sheet flicker in the Capacitor webview.
          comboboxProps={{ ...dropdownProps, withinPortal: false }}
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
        <Button
          variant="outline"
          fullWidth
          radius="md"
          leftSection={<Ban size={16} />}
          onClick={() => setConfirmingDismiss(true)}
        >
          {t("pendingRides.dismiss")}
        </Button>
      </Stack>

      <ConfirmModal
        opened={confirmingDismiss}
        onCancel={cancelDismiss}
        onConfirm={confirmDismiss}
        title={t("pendingRides.dismissTitle")}
        body={t("pendingRides.dismissBody")}
        cancelLabel={t("pendingRides.dismissCancel")}
        confirmLabel={t("pendingRides.dismissConfirm")}
        pending={dismiss.isPending}
      >
        {dismiss.isError && (
          <Text fz={13} c="red.5">
            {t("pendingRides.dismissFailed")}
          </Text>
        )}
      </ConfirmModal>
    </ResponsiveSheet>
  );
}
