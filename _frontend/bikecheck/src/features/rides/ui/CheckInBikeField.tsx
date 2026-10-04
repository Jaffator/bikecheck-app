// The check-in's bike: the one the ride goes on and where it came from.
import type { ReactElement } from "react";
import { Group, Stack, Text } from "@mantine/core";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Eyebrow } from "@/components/Eyebrow";
import type { ListedBike } from "@/features/bikes/bikes.types";
import { MISSING_BIKE_COLOR } from "@/features/rides/checkIn";
import type { BikePick } from "@/features/rides/checkInSave";
import { QUIET_COLOR } from "@/features/service_tracking/attentionLevel";
import { BikePicker } from "./BikePicker";

// Where the picked bike came from: the ride's own, a pick in this drawer, or none yet.
export type BikeSource = "strava" | "byHand" | "missing";

interface CheckInBikeFieldProps {
  bikes: ListedBike[];
  // Null while the garage loads, or with no bike picked; `fallbackName` stands in.
  picked: ListedBike | null;
  // The rider picked none of their bikes.
  notMine: boolean;
  source: BikeSource;
  fallbackName: string;
  onPick: (pick: BikePick) => void;
  pickerOpened: boolean;
  onPickerOpenedChange: (opened: boolean) => void;
}

export function CheckInBikeField({
  bikes,
  picked,
  notMine,
  source,
  fallbackName,
  onPick,
  pickerOpened,
  onPickerOpenedChange,
}: CheckInBikeFieldProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack gap={8}>
      <Group justify="space-between" gap="sm" wrap="nowrap">
        <Eyebrow>{t("checkIn.bike")}</Eyebrow>
        <SourceTag source={source} />
      </Group>
      <BikePicker
        bikes={bikes}
        picked={picked}
        notMine={notMine}
        missing={source === "missing"}
        fallbackName={fallbackName}
        onPick={onPick}
        opened={pickerOpened}
        onOpenedChange={onPickerOpenedChange}
      />
      {source === "missing" && <FieldNote text={t("checkIn.missingBikeInfo")} color="text.7" />}
      {notMine && <FieldNote text={t("checkIn.notMyBikeInfo")} color="var(--color-text-dim)" />}
    </Stack>
  );
}

function SourceTag({ source }: { source: BikeSource }): ReactElement {
  const { t } = useTranslation();
  if (source === "missing") return <RequiredTag />;

  const label = (
    <Text fz={13} c="var(--color-text-dim)" style={{ whiteSpace: "nowrap" }}>
      {t(source === "byHand" ? "checkIn.bikePickedByHand" : "checkIn.bikeFromStrava")}
    </Text>
  );
  if (source === "byHand") return label;

  return (
    <Group gap={5} wrap="nowrap">
      <Check size={12} strokeWidth={3} color={QUIET_COLOR} />
      {label}
    </Group>
  );
}

function RequiredTag(): ReactElement {
  const { t } = useTranslation();
  return (
    <Text
      fz={10}
      fw={700}
      lh="14px"
      tt="uppercase"
      lts="var(--tracking-label)"
      c={MISSING_BIKE_COLOR}
      px={7}
      py={1}
      style={{
        borderRadius: 9999,
        whiteSpace: "nowrap",
        backgroundColor: `color-mix(in srgb, ${MISSING_BIKE_COLOR} 16%, transparent)`,
      }}
    >
      {t("checkIn.required")}
    </Text>
  );
}

function FieldNote({ text, color }: { text: string; color: string }): ReactElement {
  return (
    <Text fz={13} lh={1.4} c={color} px={2}>
      {text}
    </Text>
  );
}
