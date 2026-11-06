// One bike in a sharing list: its photo, its name and the switch that lets it out.
import type { ReactElement } from "react";
import { Box, Image } from "@mantine/core";
import type { Bike } from "@/features/bikes/bikes.types";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { ShareSwitchRow } from "./ShareSwitchRow";

const THUMB_SIZE = 40;

interface ShareBikeRowProps {
  bike: Bike;
  first: boolean;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

export function ShareBikeRow({ bike, first, checked, disabled = false, onChange }: ShareBikeRowProps): ReactElement {
  return (
    <ShareSwitchRow
      first={first}
      label={bikeTitle(bike)}
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      leading={<BikeThumb bike={bike} dimmed={disabled || !checked} />}
    />
  );
}

interface BikeThumbProps {
  bike: Bike;
  dimmed: boolean;
}

function BikeThumb({ bike, dimmed }: BikeThumbProps): ReactElement {
  if (!bike.image_url) {
    return (
      <Box w={THUMB_SIZE} h={THUMB_SIZE} style={{ borderRadius: 6, backgroundColor: "var(--mantine-color-cards-5)", flexShrink: 0 }} />
    );
  }
  return (
    <Image
      src={bike.image_url}
      alt=""
      w={THUMB_SIZE}
      h={THUMB_SIZE}
      radius="sm"
      fit="cover"
      style={{ flexShrink: 0, opacity: dimmed ? 0.4 : 1 }}
    />
  );
}
