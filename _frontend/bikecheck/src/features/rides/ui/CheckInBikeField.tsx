// The check-in's bike: the one the ride goes on, or a note on why it has none.
import type { ReactElement } from "react";
import { Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Eyebrow } from "@/components/Eyebrow";
import type { ListedBike } from "@/features/bikes/bikes.types";
import type { BikePick } from "@/features/rides/rideDetail";
import { BikePicker } from "./BikePicker";

interface CheckInBikeFieldProps {
  bikes: ListedBike[];
  // Null while the garage loads, or with no bike picked; `fallbackName` stands in.
  picked: ListedBike | null;
  // The rider picked none of their bikes.
  notMine: boolean;
  // An Unassigned Ride with no bike picked yet.
  missing: boolean;
  fallbackName: string;
  onPick: (pick: BikePick) => void;
  pickerOpened: boolean;
  onPickerOpenedChange: (opened: boolean) => void;
}

export function CheckInBikeField({
  bikes,
  picked,
  notMine,
  missing,
  fallbackName,
  onPick,
  pickerOpened,
  onPickerOpenedChange,
}: CheckInBikeFieldProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack gap={8}>
      <Eyebrow>{t("checkIn.bike")}</Eyebrow>
      <BikePicker
        bikes={bikes}
        picked={picked}
        notMine={notMine}
        missing={missing}
        fallbackName={fallbackName}
        onPick={onPick}
        opened={pickerOpened}
        onOpenedChange={onPickerOpenedChange}
      />
      {missing && <FieldNote text={t("checkIn.missingBikeInfo")} color="text.7" />}
      {notMine && <FieldNote text={t("checkIn.notMyBikeInfo")} color="var(--color-text-dim)" />}
    </Stack>
  );
}

function FieldNote({ text, color }: { text: string; color: string }): ReactElement {
  return (
    <Text fz={13} lh={1.4} c={color} px={2}>
      {text}
    </Text>
  );
}
