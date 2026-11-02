// The ride drawer's actions: Save once there is something to save, delete or discard quiet in red.
import type { ReactElement } from "react";
import { Button, Group, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { disabledButtonStyles } from "@/features/add_bike_page/formStyles";
import type { RideItem } from "@/features/rides/rideDetail";
import type { RideCheckInState } from "@/features/rides/useRideCheckIn";
import { useIsDesktop } from "@/layout/breakpoints";
import { BAR_BUTTON_HEIGHT } from "./actionBar";
import { DeleteRideButton } from "./DeleteRideButton";
import { DiscardRideButton } from "./DiscardRideButton";

const SAVE_MIN_WIDTH = 120;
// A thumb's full-width button on the phone.
const PHONE_SAVE_HEIGHT = 48;

interface RideDetailActionsProps {
  item: RideItem;
  checkIn: RideCheckInState;
  onClose: () => void;
}

export function RideDetailActions({ item, checkIn, onClose }: RideDetailActionsProps): ReactElement {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const saveHeight = isDesktop ? BAR_BUTTON_HEIGHT : PHONE_SAVE_HEIGHT;
  const save = checkIn.save !== "hidden" && <SaveButton checkIn={checkIn} height={saveHeight} />;
  const remove = <RemoveButton item={item} onRemoved={onClose} />;

  // The phone sheet closes by its ✕ or a swipe, so the quiet red one just goes last.
  if (!isDesktop) {
    return (
      <Stack gap="xs">
        {save}
        <Group>{remove}</Group>
      </Stack>
    );
  }

  return (
    <Group justify="space-between" wrap="nowrap">
      {remove}
      <Group gap="xs" wrap="nowrap">
        <Button variant="outline" radius="md" size="sm" h={BAR_BUTTON_HEIGHT} onClick={onClose}>
          {t("action.close")}
        </Button>
        {save}
      </Group>
    </Group>
  );
}

function SaveButton({ checkIn, height }: { checkIn: RideCheckInState; height: number }): ReactElement {
  const { t } = useTranslation();

  return (
    <Button
      color="primary.6"
      c="textDark.6"
      radius="md"
      size="sm"
      h={height}
      miw={SAVE_MIN_WIDTH}
      disabled={checkIn.save === "disabled"}
      loading={checkIn.saving}
      styles={disabledButtonStyles}
      onClick={() => void checkIn.submit()}
    >
      {t("checkIn.save")}
    </Button>
  );
}

// An Unassigned Ride was never counted, so it is discarded rather than deleted.
function RemoveButton({ item, onRemoved }: { item: RideItem; onRemoved: () => void }): ReactElement {
  return item.kind === "ride" ? (
    <DeleteRideButton ride={item.ride} onDeleted={onRemoved} inBar />
  ) : (
    <DiscardRideButton ride={item.ride} onDiscarded={onRemoved} />
  );
}
