// The garage at a glance under the work the dashboard leads with: one narrow row per bike,
// its condition on the right, and a tap into the bike. A component only talks to hooks.
import type { ReactElement } from "react";
import { Box, Group, Image, Paper, Skeleton, Stack, Text, UnstyledButton } from "@mantine/core";
import { ChevronRight, Gauge } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBikes } from "@/features/bikes/bikes.queries";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { worstAction } from "@/features/service_tracking/attentionLevel";
import { useGarageTrackedActions } from "@/features/service_tracking/tracking.queries";
import type { GarageTrackedAction } from "@/features/service_tracking/tracking.types";
import type { Bike } from "@/features/bikes/bikes.types";
import { HealthBadge } from "@/features/service_tracking/ui/HealthBadge";

// Everything the garage tracks, quiet readings included - one request for the whole list,
// rather than one per bike.
const EVERY_READING = 0;

// The photo slot, in the 2:1 the upload crops to, so the owner's own framing survives.
const THUMB_WIDTH = 72;
const THUMB_HEIGHT = 36;

// How wide the badge's placeholder runs while the readings are in flight. Near enough to
// the pill it stands in for that the row does not shift when it arrives.
const BADGE_PLACEHOLDER_WIDTH = 68;

interface BikeRowProps {
  bike: Bike;
  // Null while the readings are still loading - an empty list would read "very good".
  actions: GarageTrackedAction[] | null;
  // Every row but the first wears the hairline above it.
  divided: boolean;
  onOpen: () => void;
}

function BikeRow({ bike, actions, divided, onOpen }: BikeRowProps): ReactElement {
  const title = bikeTitle(bike);

  return (
    <UnstyledButton
      onClick={onOpen}
      className="active:scale-[0.985]"
      px="md"
      py="sm"
      style={{
        display: "block",
        width: "100%",
        transition: "transform 0.12s ease",
        borderTop: divided ? "1px solid var(--mantine-color-cards-5)" : undefined,
      }}
    >
      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
        <Box
          w={THUMB_WIDTH}
          h={THUMB_HEIGHT}
          style={{ borderRadius: "var(--mantine-radius-md)", overflow: "hidden", flexShrink: 0 }}
        >
          {bike.image_url ? (
            <Image src={bike.image_url} alt={title} w="100%" h="100%" fit="cover" loading="lazy" bg="#FFFFFF" />
          ) : (
            // The same stand-in the bike's card uses, so a bike with no photo keeps the row's shape.
            <Box h="100%" bg="cards.7" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Gauge size={16} color="var(--mantine-color-text-9)" />
            </Box>
          )}
        </Box>

        <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
          <Text fz={14} fw={600} c="text.6" lineClamp={1}>
            {title}
          </Text>
          {bike.bike_type !== null && bike.bike_type !== "" && (
            <Text className="font-mono" fz={11} tt="uppercase" lts="0.06em" c="text.8" lineClamp={1}>
              {bike.bike_type}
            </Text>
          )}
        </Stack>

        {actions === null ? (
          <Skeleton h={18} w={BADGE_PLACEHOLDER_WIDTH} radius="xl" style={{ flexShrink: 0 }} />
        ) : (
          <HealthBadge actions={actions} compact />
        )}
        <ChevronRight size={16} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />
      </Group>
    </UnstyledButton>
  );
}

// The garage read once and split per bike, so each row reads its own condition.
function groupByBike(actions: GarageTrackedAction[]): Map<number, GarageTrackedAction[]> {
  const groups = new Map<number, GarageTrackedAction[]>();
  for (const action of actions) {
    const group = groups.get(action.bike_id);
    if (group) group.push(action);
    else groups.set(action.bike_id, [action]);
  }
  return groups;
}

export function BikeHealthList(): ReactElement | null {
  const navigate = useNavigate();
  const { data: bikes } = useBikes();
  const { data: garage } = useGarageTrackedActions(EVERY_READING);

  if (!bikes || bikes.length === 0) return null;

  const groups = garage ? groupByBike(garage) : null;
  // Worst first: the card is read top down, and the bike in trouble is what it is for.
  const rows = [...bikes].sort((left, right) => {
    const reading = (bike: Bike): number => worstAction(groups?.get(bike.id) ?? [])?.percentage ?? 0;
    return reading(right) - reading(left);
  });

  return (
    <Paper
      radius="lg"
      style={{
        overflow: "hidden",
        backgroundColor: "var(--mantine-color-cards-6)",
        backgroundImage: "var(--card-glow)",
        border: "none",
        boxShadow: "var(--elev-panel)",
      }}
    >
      {rows.map((bike, index) => (
        <BikeRow
          key={bike.id}
          bike={bike}
          actions={groups ? (groups.get(bike.id) ?? []) : null}
          divided={index > 0}
          onOpen={() => navigate(`/bikes/${String(bike.id)}`)}
        />
      ))}
    </Paper>
  );
}
