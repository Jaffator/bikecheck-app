// What the owner can do with this bike, as a 2x2 grid. Two weights: a filled tile does
// something, an outlined one with a chevron goes somewhere.
import type { ReactElement, ReactNode } from "react";
import { Box, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ChevronRight, FileText, History, Link2, Plus, Share2 } from "lucide-react";

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
        icon={<Plus size={20} />}
        label={t("fab.addService")}
        onClick={onAddService}
        // The act run most often, so it is the loudest thing on the grid.
        fill="var(--mantine-color-primary-6)"
        textColor="var(--mantine-color-black)"
      />

      {paired ? (
        <Tile icon={<History size={20} />} label={t("bikes.tileServiceHistory")} onClick={onOpenHistory} navigates />
      ) : (
        <Tile
          icon={<Link2 size={20} />}
          label={t("strava.pairBike")}
          onClick={onPairGear}
          fill="var(--mantine-color-strava-6)"
          textColor="var(--mantine-color-white)"
        />
      )}

      <Tile icon={<Share2 size={20} />} label={t("report.exportBikeCheck")} onClick={onExportReport} navigates />
      <Tile icon={<FileText size={20} />} label={t("report.myReports")} onClick={onOpenReports} navigates />
    </SimpleGrid>
  );
}

// One tile. Filled when it acts, outlined with a chevron when it navigates.
function Tile({
  icon,
  label,
  onClick,
  fill,
  textColor,
  navigates = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  fill?: string;
  textColor?: string;
  navigates?: boolean;
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
        border: filled ? "1px solid transparent" : "1px solid var(--color-border-subtle)",
        boxShadow: "var(--elev-row)",
        color: filled ? textColor : "var(--mantine-color-text-6)",
        cursor: "pointer",
        transition: "transform 120ms ease",
      }}
    >
      <Stack gap="sm">
        <Box style={{ display: "flex", color: filled ? textColor : "var(--mantine-color-primary-6)" }}>{icon}</Box>

        <Box style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Text fz={14} fw={600} c={filled ? textColor : "text.6"} style={{ flex: 1, minWidth: 0 }} lineClamp={2}>
            {label}
          </Text>
          {/* Says "this goes somewhere" rather than "this does something". */}
          {navigates && <ChevronRight size={16} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />}
        </Box>
      </Stack>
    </Paper>
  );
}
