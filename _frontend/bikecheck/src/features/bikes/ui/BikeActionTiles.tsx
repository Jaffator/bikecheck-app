// What the owner can do with this bike, as a two-by-two grid on phone and desktop alike. Two
// weights: a filled tile is a branded act, an outlined one goes somewhere and carries a chevron.
import type { ReactElement, ReactNode } from "react";
import { Box, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ChevronRight, History, Link2, SlidersHorizontal } from "lucide-react";
import { Bikecheck } from "@/assets/icons/bikecheck";

interface BikeActionTilesProps {
  // Absent on an Archived Bike, which takes no new work.
  onAddService?: () => void;
  onOpenHistory: () => void;
  // The Setup screen: the numbers the bike is ridden at (ADR 0029).
  onOpenSetup: () => void;
  // The bike's Reports, where each Share Link is opened or closed.
  onOpenLinks: () => void;
  // Open Share Links, zero included, so the tile always says how many are out.
  openLinks: number;
}

export function BikeActionTiles({
  onAddService,
  onOpenHistory,
  onOpenSetup,
  onOpenLinks,
  openLinks,
}: BikeActionTilesProps): ReactElement {
  const { t } = useTranslation();

  return (
    <SimpleGrid cols={2} spacing="sm">
      {onAddService !== undefined && (
        <Tile
          // Servicing is the app's own act, so the tile wears the app's own mark.
          icon={<Bikecheck width={26} height={20} />}
          label={t("fab.addService")}
          onClick={onAddService}
          // The act run most often, so it is the loudest thing on the grid.
          fill="var(--mantine-color-primary-6)"
          textColor="var(--mantine-color-black)"
        />
      )}
      <Tile icon={<History size={20} />} label={t("bikes.tileServiceHistory")} onClick={onOpenHistory} />
      <Tile icon={<SlidersHorizontal size={20} />} label={t("setup.tile")} onClick={onOpenSetup} />
      <Tile icon={<Link2 size={20} />} label={t("report.linksTile")} onClick={onOpenLinks} count={openLinks} />
    </SimpleGrid>
  );
}

interface TileProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  fill?: string;
  textColor?: string;
  // A figure beside the chevron.
  count?: number;
}

// One tile. Filled when it is branded, outlined otherwise; an outlined one goes somewhere, so
// its chevron sits against the right edge, centred on the tile rather than on the label.
function Tile({ icon, label, onClick, fill, textColor, count }: TileProps): ReactElement {
  const filled = fill !== undefined;

  return (
    <Paper
      radius="lg"
      p="md"
      onClick={onClick}
      role="button"
      // A tile is itself one button, so it presses - see docs/ui/card-surface.md.
      className="active:scale-[0.985]"
      style={{
        backgroundColor: filled ? fill : "var(--mantine-color-cards-6)",
        boxShadow: "var(--elev-row)",
        color: filled ? textColor : "var(--mantine-color-text-6)",
        cursor: "pointer",
        transition: "transform 120ms ease",
      }}
    >
      <Box style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Stack gap="sm" style={{ flex: 1, minWidth: 0 }}>
          <Box style={{ display: "flex", color: filled ? textColor : "var(--mantine-color-primary-6)" }}>{icon}</Box>
          <Text fz={14} fw={600} c={filled ? textColor : "text.6"} lineClamp={2}>
            {label}
          </Text>
        </Stack>
        {count !== undefined && (
          <Text className="tabular-nums" fz={14} fw={600} c="text.8">
            {count}
          </Text>
        )}
        {!filled && <ChevronRight size={16} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />}
      </Box>
    </Paper>
  );
}
