// Renders pending ride assignment through query hooks.
import { useState, type ReactElement } from "react";
import { Button, Group, Select, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Ban, ChevronDown } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { useBikes } from "@/features/bikes/bikes.queries";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { inputStyles, dropdownProps, disabledButtonStyles } from "@/features/add_bike_page/formStyles";
import { useDismissPendingRide, useResolvePendingRide } from "@/features/strava/strava.queries";
import type { PendingRide } from "@/features/strava/strava.types";
import { RideSummaryCard } from "@/features/rides/ui/RideSummaryCard";

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
        // The desktop panel's foot; a bottom sheet takes the wrapper's.
        body: { flex: 1, display: "flex", flexDirection: "column", paddingBottom: "2rem" },
        header: { marginBottom: "1.5rem" },
        // Centers the title against the complete header.
        title: { flex: 1, textAlign: "center", marginInlineStart: "2rem" },
      }}
    >
      <Stack gap={20} h="100%">
        <Text fw={700} fz={20} c="text.7" ta="center">
          {t("pendingRides.chooseBikeTitle")}
        </Text>
        {ride !== null && <RideSummaryCard ride={ride} />}

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
