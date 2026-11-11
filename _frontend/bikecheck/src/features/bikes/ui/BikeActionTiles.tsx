// What the owner can do with this bike: one wide branded act over a row of four quiet icon tiles,
// the same on phone and desktop.
import type { ReactElement, ReactNode } from "react";
import { Box, Button, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Download, Link2, Plus, SlidersHorizontal } from "lucide-react";
import { Bikecheck } from "@/assets/icons/bikecheck";

interface BikeActionTilesProps {
  // Absent on an Archived Bike, which takes no new work.
  onAddService?: () => void;
  onOpenHistory: () => void;
  // The Setup screen: the numbers the bike is ridden at (ADR 0029).
  onOpenSetup: () => void;
  // The bike's Reports, where each Share Link is opened or closed.
  onOpenLinks: () => void;
  // Open Share Links; the badge shows only when some are out.
  openLinks: number;
  // The Bike Report export sheet.
  onExport: () => void;
}

export function BikeActionTiles({
  onAddService,
  onOpenHistory,
  onOpenSetup,
  onOpenLinks,
  openLinks,
  onExport,
}: BikeActionTilesProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      {onAddService !== undefined && (
        <Button
          color="primary.6"
          c="textDark.6"
          radius="md"
          fz={16}
          fw={600}
          leftSection={<Plus size={20} />}
          onClick={onAddService}
          style={{ height: 52 }}
        >
          {t("fab.addService")}
        </Button>
      )}
      <SimpleGrid cols={4} spacing={8}>
        <Tile icon={<Bikecheck width={28} height={22} />} label={t("bikes.tileServiceHistory")} onClick={onOpenHistory} />
        <Tile icon={<SlidersHorizontal size={22} />} label={t("setup.tile")} onClick={onOpenSetup} />
        <Tile icon={<Link2 size={22} />} label={t("report.linksTile")} onClick={onOpenLinks} count={openLinks} />
        {/* Archived bikes keep it: a bike being sold is when a report is most often asked for. */}
        <Tile icon={<Download size={22} />} label={t("report.export")} onClick={onExport} />
      </SimpleGrid>
    </Stack>
  );
}

interface TileProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  count?: number;
}

function Tile({ icon, label, onClick, count }: TileProps): ReactElement {
  return (
    <Paper
      component="button"
      type="button"
      radius="lg"
      onClick={onClick}
      // A tile is itself one button, so it presses - see docs/ui/card-surface.md.
      className="hover-veil active:scale-[0.985]"
      style={{
        position: "relative",
        height: 80,
        padding: 0,
        border: "1px solid var(--color-border)",
        backgroundColor: "var(--mantine-color-cards-6)",
        boxShadow: "var(--elev-row)",
        color: "var(--mantine-color-text-5)",
        cursor: "pointer",
        transition: "transform 120ms ease",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      <Box style={{ display: "flex", height: 22, alignItems: "center" }}>{icon}</Box>
      <Text fz={13} fw={500} c="text.6" lineClamp={1}>
        {label}
      </Text>
      {count !== undefined && count > 0 && <CountBadge count={count} />}
    </Paper>
  );
}

function CountBadge({ count }: { count: number }): ReactElement {
  return (
    <Text
      component="span"
      className="tabular-nums"
      fz={11}
      fw={600}
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        minWidth: 18,
        height: 18,
        padding: "0 5px",
        borderRadius: 9,
        backgroundColor: "var(--color-border)",
        color: "var(--color-text-dim)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {count}
    </Text>
  );
}
