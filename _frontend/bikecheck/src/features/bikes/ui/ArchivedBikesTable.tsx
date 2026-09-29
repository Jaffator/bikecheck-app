// Desktop's archive, inline under the garage switch: newest archived first, a row opens the bike (ADR 0024).
import { useState, type MouseEvent, type ReactElement } from "react";
import { Box, Button, Group, Stack, Text } from "@mantine/core";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Eyebrow } from "@/components/Eyebrow";
import { Panel, PanelSkeletonRows, PanelTableHead } from "@/components/Panel";
import { PANEL_HAIRLINE, PANEL_ROW_PADDING, PRESS_TRANSITION, onPanelRowKey } from "@/components/panelRows";
import { formatKm } from "@/features/profile/profileFormat";
import { useArchivedBikes } from "@/features/bikes/bikes.queries";
import type { Bike, ListedBike } from "@/features/bikes/bikes.types";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { ArchivedBikeConfirms } from "./ArchivedBikeConfirms";
import { BikeThumb } from "./BikeThumb";

const ARCHIVE_COLUMNS = "56px minmax(0, 1.6fr) minmax(0, 1fr) 96px 112px 232px";

export function ArchivedBikesTable(): ReactElement {
  const { t } = useTranslation();
  const { data: bikes, isLoading } = useArchivedBikes();
  const [restoring, setRestoring] = useState<Bike | null>(null);
  const [destroying, setDestroying] = useState<Bike | null>(null);
  const rows = newestArchivedFirst(bikes ?? []);

  return (
    <>
      <Panel title={t("archive.title")} count={bikes?.length}>
        {isLoading ? (
          <PanelSkeletonRows count={3} />
        ) : rows.length === 0 ? (
          <Text fz={13} c="var(--color-text-dim)" px="md" pb="md">
            {t("archive.empty")}
          </Text>
        ) : (
          <>
            <PanelTableHead
              columns={ARCHIVE_COLUMNS}
              cells={["", t("bikes.columnBike"), t("bikes.columnType"), t("bikes.distance"), t("bikes.columnArchivedOn"), ""]}
              rightAligned={[3, 4]}
            />
            {rows.map((bike) => (
              <ArchivedRow
                key={bike.id}
                bike={bike}
                onRestore={() => setRestoring(bike)}
                onDestroy={() => setDestroying(bike)}
              />
            ))}
          </>
        )}
      </Panel>

      <ArchivedBikeConfirms
        restoring={restoring}
        onRestoreClose={() => setRestoring(null)}
        destroying={destroying}
        onDestroyClose={() => setDestroying(null)}
      />
    </>
  );
}

interface ArchivedRowProps {
  bike: ListedBike;
  onRestore: () => void;
  onDestroy: () => void;
}

function ArchivedRow({ bike, onRestore, onDestroy }: ArchivedRowProps): ReactElement {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const open = (): void => {
    void navigate(`/bikes/${String(bike.id)}`);
  };
  // The buttons sit inside the row, which would otherwise open the bike too.
  const only = (action: () => void): ((event: MouseEvent) => void) => (event: MouseEvent): void => {
    event.stopPropagation();
    action();
  };

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => onPanelRowKey(event, open)}
      className="hover-veil active:scale-[0.985]"
      style={{
        display: "grid",
        gridTemplateColumns: ARCHIVE_COLUMNS,
        alignItems: "center",
        gap: 12,
        padding: PANEL_ROW_PADDING,
        borderTop: PANEL_HAIRLINE,
        transition: PRESS_TRANSITION,
      }}
    >
      <BikeThumb bike={bike} />
      <Stack gap={0} style={{ minWidth: 0 }}>
        <Text fz={13} fw={600} c="text.6" lineClamp={1}>
          {bikeTitle(bike)}
        </Text>
        {bike.bikename !== null && bike.bikename !== "" && <Eyebrow>{bike.bikename}</Eyebrow>}
      </Stack>
      <Text fz={13} c="text.7" lineClamp={1}>
        {bike.bike_type ?? "—"}
      </Text>
      <Text className="tabular-nums" fz={13} c="text.7" ta="right">
        {formatKm(bike.total_km ?? 0, i18n.language)}
      </Text>
      <Text className="tabular-nums" fz={13} c="text.7" ta="right">
        {bike.deleted_at === null ? "—" : dayjs(bike.deleted_at).format("D. M. YYYY")}
      </Text>
      <Group gap="xs" wrap="nowrap" justify="flex-end">
        <Button variant="outline" radius="md" size="xs" onClick={only(onRestore)}>
          {t("archive.unarchive")}
        </Button>
        <Button
          variant="filled"
          color="red.5"
          radius="md"
          size="xs"
          styles={{ root: { "--button-color": "black" } as React.CSSProperties }}
          onClick={only(onDestroy)}
        >
          {t("archive.deleteForever")}
        </Button>
      </Group>
    </Box>
  );
}

// ISO strings order as dates; a bike with no archive date goes last.
function newestArchivedFirst(bikes: ListedBike[]): ListedBike[] {
  return [...bikes].sort((left, right) => (right.deleted_at ?? "").localeCompare(left.deleted_at ?? ""));
}
