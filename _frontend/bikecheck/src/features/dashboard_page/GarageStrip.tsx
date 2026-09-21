// The garage at a glance: every bike in use, hung side by side across the top of Home. One
// chip per bike - its photo, its name, the health pill the garage card wears - and an empty
// hook at the end for the next one. A component only talks to hooks.
import type { CSSProperties, ReactElement } from "react";
import { Box, Group, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import type { Bike } from "@/features/bikes/bikes.types";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { BikePhoto } from "@/features/bikes/ui/BikePhoto";
import { HealthBadge } from "@/features/service_tracking/ui/HealthBadge";
import { useGarageTrackedActions } from "@/features/service_tracking/tracking.queries";
import type { TrackedAction } from "@/features/service_tracking/tracking.types";

// How wide a chip runs: most of a phone, so the next one shows its edge and asks to be
// pulled in; capped so a browser column does not turn the strip into two garage cards.
const CHIP_WIDTH = "min(68vw, 260px)";

// The chip wears the garage card's surface at panel weight, and the same hairline.
const CHIP: CSSProperties = {
  width: CHIP_WIDTH,
  flexShrink: 0,
  scrollSnapAlign: "start",
  borderRadius: "var(--mantine-radius-lg)",
  overflow: "hidden",
  backgroundColor: "var(--mantine-color-cards-6)",
  border: "1px solid var(--mantine-color-cards-5)",
  boxShadow: "var(--elev-panel)",
  transition: "transform 0.12s ease",
};

interface GarageStripProps {
  bikes: Bike[];
}

export function GarageStrip({ bikes }: GarageStripProps): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // One garage read for every pill rather than a request per chip; 0 asks for every
  // reading, since a pill at "good" needs to know there is nothing above it.
  const { data: garage } = useGarageTrackedActions(0);

  function actionsOf(bikeId: number): TrackedAction[] {
    return (garage ?? []).filter((action) => action.bike_id === bikeId);
  }

  return (
    // Bleeds to the screen edges through the page's own padding, so the strip scrolls
    // under the margin rather than stopping at it.
    <Box
      mx="-md"
      px="md"
      py={4}
      style={{
        display: "flex",
        gap: "var(--mantine-spacing-sm)",
        overflowX: "auto",
        scrollSnapType: "x mandatory",
        scrollPaddingInline: "var(--mantine-spacing-md)",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
        // The strip runs off the right edge on purpose; the fade says so before the cut does.
        maskImage: "linear-gradient(to right, #000 calc(100% - 2.5rem), transparent)",
        WebkitMaskImage: "linear-gradient(to right, #000 calc(100% - 2.5rem), transparent)",
      }}
    >
      {bikes.map((bike) => (
        <UnstyledButton
          key={bike.id}
          onClick={() => navigate(`/bikes/${bike.id}`)}
          aria-label={bikeTitle(bike)}
          className="active:scale-[0.985]"
          style={CHIP}
        >
          <BikePhoto imageUrl={bike.image_url} title={bikeTitle(bike)} subtitle={bike.bikename} titleSize={15}>
            <HealthBadge actions={actionsOf(bike.id)} />
          </BikePhoto>
        </UnstyledButton>
      ))}

      {/* The empty hook: the way to a new bike, drawn as the space one would fill. */}
      <UnstyledButton
        onClick={() => navigate("/bikes/new")}
        className="active:scale-[0.985]"
        style={{
          ...CHIP,
          width: `calc(${CHIP_WIDTH} * 0.55)`,
          backgroundColor: "transparent",
          border: "1px dashed var(--mantine-color-cards-4)",
          boxShadow: "none",
        }}
      >
        <Group justify="center" align="center" gap={6} h="100%">
          <Plus size={16} color="var(--color-text-dim)" />
          <Text fz={13} fw={600} c="var(--color-text-dim)">
            {t("fab.addBike")}
          </Text>
        </Group>
      </UnstyledButton>
    </Box>
  );
}
