// The check-in's bike: the one the ride goes on, where it came from, and what the ride wore off it.
import type { ReactElement } from "react";
import { Box, Group, Stack, Text } from "@mantine/core";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Eyebrow } from "@/components/Eyebrow";
import type { ListedBike } from "@/features/bikes/bikes.types";
import type { Ride } from "@/features/rides/rides.types";
import { woreOffColor, woreOffLabel } from "@/features/rides/woreOff";
import { QUIET_COLOR, trackedActionKey } from "@/features/service_tracking/attentionLevel";
import { BikePicker } from "./BikePicker";

interface CheckInBikeFieldProps {
  ride: Ride;
  bikes: ListedBike[];
  // Null while the garage loads; the ride's own bike name stands in.
  picked: ListedBike | null;
  // Another bike than the one the ride is saved on.
  pickedByHand: boolean;
  onPick: (bikeId: number) => void;
  pickerOpened: boolean;
  onPickerOpenedChange: (opened: boolean) => void;
}

export function CheckInBikeField({
  ride,
  bikes,
  picked,
  pickedByHand,
  onPick,
  pickerOpened,
  onPickerOpenedChange,
}: CheckInBikeFieldProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack gap={8}>
      <Group justify="space-between" gap="sm" wrap="nowrap">
        <Eyebrow>{t("checkIn.bike")}</Eyebrow>
        <SourceTag pickedByHand={pickedByHand} />
      </Group>
      <BikePicker
        bikes={bikes}
        picked={picked}
        fallbackName={ride.bike_name ?? t("rides.unknownBike")}
        onPick={onPick}
        opened={pickerOpened}
        onOpenedChange={onPickerOpenedChange}
      />
      {/* What the ride wore off holds only for the bike it is saved on. */}
      {!pickedByHand && <WoreOffLine ride={ride} />}
    </Stack>
  );
}

function SourceTag({ pickedByHand }: { pickedByHand: boolean }): ReactElement {
  const { t } = useTranslation();
  const label = (
    <Text fz={13} c="var(--color-text-dim)" style={{ whiteSpace: "nowrap" }}>
      {t(pickedByHand ? "checkIn.bikePickedByHand" : "checkIn.bikeFromStrava")}
    </Text>
  );
  if (pickedByHand) return label;

  return (
    <Group gap={5} wrap="nowrap">
      <Check size={12} strokeWidth={3} color={QUIET_COLOR} />
      {label}
    </Group>
  );
}

// Kept to one line: the drawer must not grow with a long list.
function WoreOffLine({ ride }: { ride: Ride }): ReactElement | null {
  const { t } = useTranslation();
  if (ride.wore_off.length === 0) return null;

  return (
    <Group gap={8} wrap="nowrap" align="baseline" px={2}>
      <Text fz={13} c="var(--color-text-dim)" style={{ flexShrink: 0 }}>
        {t("checkIn.woreOff")}
      </Text>
      <Text fz={13} c="text.7" className="tabular-nums" lineClamp={1} style={{ minWidth: 0 }}>
        {ride.wore_off.map((line, index) => (
          <Box component="span" key={trackedActionKey(line)}>
            {index > 0 && " · "}
            {`${woreOffLabel(line, t)} ${t("tracking.percentage", { value: line.before })} → `}
            <Text span inherit c={woreOffColor(line)}>
              {t("tracking.percentage", { value: line.after })}
            </Text>
          </Box>
        ))}
      </Text>
    </Group>
  );
}
