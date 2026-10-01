// The check-in's bike: the one the ride is saved on, and what the ride wore off it.
import type { ReactElement } from "react";
import { Box, Group, Stack, Text } from "@mantine/core";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Eyebrow } from "@/components/Eyebrow";
import { bikeTitle, bikeTypeAndYear } from "@/features/bikes/bikeTitle";
import type { ListedBike } from "@/features/bikes/bikes.types";
import { BikeColorDot } from "@/features/bikes/ui/BikeColorDot";
import type { Ride } from "@/features/rides/rides.types";
import { woreOffColor, woreOffLabel } from "@/features/rides/woreOff";
import { QUIET_COLOR, trackedActionKey } from "@/features/service_tracking/attentionLevel";

interface CheckInBikeFieldProps {
  ride: Ride;
  // Null while the garage loads; the ride's own bike name stands in.
  bike: ListedBike | null;
}

export function CheckInBikeField({ ride, bike }: CheckInBikeFieldProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack gap={8}>
      <Group justify="space-between" gap="sm" wrap="nowrap">
        <Eyebrow>{t("checkIn.bike")}</Eyebrow>
        <Group gap={5} wrap="nowrap">
          <Check size={12} strokeWidth={3} color={QUIET_COLOR} />
          <Text fz={13} c="var(--color-text-dim)" style={{ whiteSpace: "nowrap" }}>
            {t("checkIn.bikeFromStrava")}
          </Text>
        </Group>
      </Group>
      <BikeRow ride={ride} bike={bike} />
      <WoreOffLine ride={ride} />
    </Stack>
  );
}

function BikeRow({ ride, bike }: CheckInBikeFieldProps): ReactElement {
  const { t } = useTranslation();
  // The year goes in the line below, so the name leaves it out.
  const name = bike === null ? (ride.bike_name ?? t("rides.unknownBike")) : bikeTitle({ ...bike, year: null });
  const meta = bike === null ? "" : bikeTypeAndYear(bike);

  return (
    <Group
      gap={12}
      wrap="nowrap"
      mih={56}
      px={14}
      py={8}
      style={{
        borderRadius: 12,
        border: "1px solid var(--mantine-color-inputs-5)",
        backgroundColor: "var(--mantine-color-cards-7)",
      }}
    >
      <BikeColorDot colorIndex={bike?.color_index ?? null} size={10} />
      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
        <Text fz={16} fw={600} c="text.6" lineClamp={1}>
          {name}
        </Text>
        {meta !== "" && <Eyebrow>{meta}</Eyebrow>}
      </Stack>
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
