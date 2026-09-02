// UI component using feature hooks.
import { useEffect, useRef, type ReactElement } from "react";
import { Chip, Group, ScrollArea } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { Bike } from "@/features/bikes/bikes.types";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { chipStyles } from "../add_bike_page/formStyles";

// The all-bikes chip has no id of its own, so it carries a value no bike can.
const ALL_BIKES = "all";

// Keeps a scrolled-in chip off the edge of the bar, which also says there is more behind it.
const SCROLL_MARGIN_PX = 12;

interface BikeFilterChipsProps {
  bikes: Bike[];
  // Null reads as every bike.
  selected: number | null;
  onSelect: (bikeId: number | null) => void;
}

// Lets the user read one bike's story at a time.
export function BikeFilterChips({ bikes, selected, onSelect }: BikeFilterChipsProps): ReactElement {
  const { t } = useTranslation();
  // Lands on whichever chip is selected, so one ref does the work of a map.
  const selectedRef = useRef<HTMLDivElement>(null);

  // A selection the user did not scroll to - arriving from a bike, or swiping the page -
  // can sit off the end of the bar, and a bar that does not move reads as nothing selected.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    selectedRef.current?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      // Vertical is left alone: the bar is already in view and the page must not jump.
      block: "nearest",
      // Moves only as far as it takes, so a chip already in view stays where it is.
      inline: "nearest",
    });
  }, [selected]);

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
          <Chip
            value={ALL_BIKES}
            radius="xl"
            size="sm"
            color="primary.6"
            rootRef={selected === null ? selectedRef : undefined}
            style={{ scrollMarginInline: SCROLL_MARGIN_PX }}
            styles={chipStyles(selected === null, { wrap: false })}
          >
            {t("service.allBikes")}
          </Chip>
          {bikes.map((bike) => (
            <Chip
              key={bike.id}
              value={String(bike.id)}
              radius="xl"
              size="sm"
              color="primary.6"
              rootRef={selected === bike.id ? selectedRef : undefined}
              style={{ scrollMarginInline: SCROLL_MARGIN_PX }}
              styles={chipStyles(selected === bike.id, { wrap: false })}
            >
              {/* The same name the garage and the bike detail give it. */}
              {bikeTitle(bike)}
            </Chip>
          ))}
        </Group>
      </Chip.Group>
    </ScrollArea>
  );
}
