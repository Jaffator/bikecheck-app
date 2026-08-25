// UI component using feature hooks.
import type { ReactElement } from "react";
import { Chip, Group, ScrollArea } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { Bike } from "@/features/bikes/bikes.types";

// The all-bikes chip has no id of its own, so it carries a value no bike can.
const ALL_BIKES = "all";

interface BikeFilterChipsProps {
  bikes: Bike[];
  // Null reads as every bike.
  selected: number | null;
  onSelect: (bikeId: number | null) => void;
}

// Lets the user read one bike's story at a time.
export function BikeFilterChips({ bikes, selected, onSelect }: BikeFilterChipsProps): ReactElement {
  const { t } = useTranslation();

  return (
    // A garage of several bikes scrolls sideways rather than wrapping into the page.
    <ScrollArea type="never" offsetScrollbars={false}>
      <Chip.Group
        multiple={false}
        value={selected === null ? ALL_BIKES : String(selected)}
        onChange={(value) => {
          onSelect(value === ALL_BIKES ? null : Number(value));
        }}
      >
        <Group gap="xs" wrap="nowrap" px="md" py="xs">
          <Chip value={ALL_BIKES} radius="xl" size="sm" color="primary.6">
            {t("service.allBikes")}
          </Chip>
          {bikes.map((bike) => (
            <Chip key={bike.id} value={String(bike.id)} radius="xl" size="sm" color="primary.6">
              {/* The same name the garage and the bike detail give it. */}
              {bike.bikename ?? bike.bike_model ?? bike.bike_brand}
            </Chip>
          ))}
        </Group>
      </Chip.Group>
    </ScrollArea>
  );
}
