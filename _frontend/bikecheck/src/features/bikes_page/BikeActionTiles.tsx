// What the owner can do with this bike, as a 2x2 grid. Two weights: a filled tile is a
// branded act, an outlined one goes somewhere. Every tile carries a chevron on its right.
import type { ReactElement, ReactNode } from "react";
import { Box, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ChevronRight, FileText, History, Share2 } from "lucide-react";
import { Bikecheck } from "@/assets/icons/bikecheck";
import StravaMark from "@/assets/icons/svg_icons/strava.svg?react";

interface BikeActionTilesProps {
  // The fourth tile switches on this: an unpaired bike is offered pairing, a paired one
  // its service history. The grid stays full either way.
  paired: boolean;
  onAddService: () => void;
  onExportReport: () => void;
  onOpenReports: () => void;
  onPairGear: () => void;
  onOpenHistory: () => void;
}

export function BikeActionTiles({
  paired,
  onAddService,
  onExportReport,
  onOpenReports,
  onPairGear,
  onOpenHistory,
}: BikeActionTilesProps): ReactElement {
  const { t } = useTranslation();

  return (
    <SimpleGrid cols={2} spacing="sm">
      <Tile
        // Servicing is the app's own act, so the tile wears the app's own mark.
        icon={<Bikecheck width={26} height={20} />}
        label={t("fab.addService")}
        onClick={onAddService}
        // The act run most often, so it is the loudest thing on the grid.
        fill="var(--mantine-color-primary-6)"
        textColor="var(--mantine-color-black)"
      />

      {paired ? (
        <Tile icon={<History size={20} />} label={t("bikes.tileServiceHistory")} onClick={onOpenHistory} />
      ) : (
        <Tile
          // Pairing is Strava's act, so it wears Strava's mark on Strava's colour.
          icon={<StravaMark width={20} height={20} />}
          label={t("strava.pairBike")}
          onClick={onPairGear}
          fill="var(--mantine-color-strava-6)"
          textColor="var(--mantine-color-white)"
        />
      )}

      <Tile icon={<Share2 size={20} />} label={t("report.exportBikeCheck")} onClick={onExportReport} />
      <Tile icon={<FileText size={20} />} label={t("report.myReports")} onClick={onOpenReports} />
    </SimpleGrid>
  );
}

// One tile. Filled when it is branded, outlined otherwise; the chevron sits against the
// right edge, centred on the tile rather than on the label.
function Tile({
  icon,
  label,
  onClick,
  fill,
  textColor,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  fill?: string;
  textColor?: string;
}): ReactElement {
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
        backgroundImage: filled ? undefined : "var(--card-glow)",
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
        {/* Says "this goes somewhere" rather than "this does something". */}
        <ChevronRight size={16} color={filled ? textColor : "var(--color-text-dim)"} style={{ flexShrink: 0 }} />
      </Box>
    </Paper>
  );
}
