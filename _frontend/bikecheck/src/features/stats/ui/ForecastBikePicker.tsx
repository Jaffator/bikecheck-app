// The forecast's bike picker: a bright name and a chevron, so it reads as a choice and not as the card's text.
import { useState, type CSSProperties, type ReactElement } from "react";
import { Box, Menu, Stack, Text, UnstyledButton } from "@mantine/core";
import { Check, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BikeIcon_fill } from "@/assets/icons/bikecheck";
import { bikeColor, colorIndexOf } from "@/features/bikes/bikeColors";
import type { ListedBike } from "@/features/bikes/bikes.types";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import type { WearForecastItem } from "../stats.types";
import { bikeLevel } from "../wearForecast";

// The icon's 209x131 viewBox.
const ICON_RATIO = 131 / 209;

const TRIGGER_STYLE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  height: 44,
  // The padding only gives the hover veil room; the margin takes it back so the chevron ends on the card's edge.
  padding: "0 6px",
  marginRight: -6,
  // The title keeps its width; a long name truncates beside it.
  minWidth: 0,
  borderRadius: 12,
};

const DROPDOWN_STYLE: CSSProperties = {
  width: 300,
  padding: 6,
  borderRadius: 16,
  backgroundColor: "var(--color-surface-raised)",
  border: "1px solid var(--color-border-raised)",
  boxShadow: "var(--elev-hero)",
};

interface ForecastBikePickerProps {
  // The bike shown; the garage list only adds its colour and the others.
  item: WearForecastItem;
  bikes: ListedBike[];
  items: WearForecastItem[];
  onPick: (bikeId: number) => void;
}

// One bike is not a choice worth offering, so it gets the same face and opens nothing.
export function ForecastBikePicker({ item, bikes, items, onPick }: ForecastBikePickerProps): ReactElement {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  const label = <TriggerLabel item={item} colorIndex={colorIndexOf(bikes, item.bike_id)} />;
  if (bikes.length < 2) return <Box style={TRIGGER_STYLE}>{label}</Box>;

  // In place, not portalled: a portalled list flickers in the Capacitor webview.
  return (
    <Menu position="bottom-end" withinPortal={false} opened={opened} onChange={setOpened}>
      <Menu.Target>
        <UnstyledButton className="hover-veil" style={TRIGGER_STYLE}>
          {label}
          <ChevronDown
            size={16}
            strokeWidth={2.2}
            color="var(--mantine-color-text-8)"
            style={{ flexShrink: 0, transition: "transform 160ms ease", transform: opened ? "rotate(180deg)" : "none" }}
          />
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown style={DROPDOWN_STYLE}>
        <Menu.Label fz={11} fw={600} tt="uppercase" c="text.8" style={{ letterSpacing: "var(--tracking-label)" }}>
          {t("stats.forecastYourBikes")}
        </Menu.Label>
        {bikes.map((bike) => (
          <BikeOption
            key={bike.id}
            bike={bike}
            meta={bikeMeta(bike, t(`bikes.health.${bikeLevel(items, bike.id)}`))}
            selected={bike.id === item.bike_id}
            onPick={onPick}
          />
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

// Type and year only when known; the condition always.
function bikeMeta(bike: ListedBike, condition: string): string {
  return [bike.bike_type, bike.year, condition].filter((part) => part !== null && part !== "").join(" · ");
}

interface BikeOptionProps {
  bike: ListedBike;
  meta: string;
  selected: boolean;
  onPick: (bikeId: number) => void;
}

function BikeOption({ bike, meta, selected, onPick }: BikeOptionProps): ReactElement {
  return (
    <Menu.Item
      color="text"
      mih={52}
      px={10}
      py={8}
      style={{ borderRadius: 10, backgroundColor: selected ? "rgba(255, 255, 255, 0.07)" : undefined }}
      leftSection={<BikeTile colorIndex={bike.color_index} size={36} />}
      rightSection={selected ? <Check size={18} strokeWidth={2.5} color="var(--mantine-color-text-6)" /> : undefined}
      onClick={() => onPick(bike.id)}
    >
      <Stack gap={2} miw={0}>
        <Text fz={14} fw={600} c="text.6" truncate>
          {bikeTitle(bike)}
        </Text>
        <Text fz={12} c="text.8" truncate>
          {meta}
        </Text>
      </Stack>
    </Menu.Item>
  );
}

function TriggerLabel({ item, colorIndex }: { item: WearForecastItem; colorIndex: number | null }): ReactElement {
  return (
    <>
      <BikeTile colorIndex={colorIndex} size={32} />
      <Text fz={14} fw={600} c="text.6" truncate>
        {bikeTitle(item)}
      </Text>
    </>
  );
}

// A fixed box, so names line up whatever the icon's shape.
function BikeTile({ colorIndex, size }: { colorIndex: number | null; size: number }): ReactElement {
  const color = colorIndex === null ? "var(--mantine-color-text-8)" : bikeColor(colorIndex);
  const iconWidth = Math.round(size * 0.55);

  return (
    <Box w={size} h={size} style={{ display: "grid", placeItems: "center", flexShrink: 0 }}>
      <BikeIcon_fill width={iconWidth} height={iconWidth * ICON_RATIO} style={{ color }} aria-hidden />
    </Box>
  );
}
