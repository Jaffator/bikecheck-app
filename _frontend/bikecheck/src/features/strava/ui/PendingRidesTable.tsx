// Desktop's Nepřiřazené tab: one row per pending ride, assigned or dismissed inline from its menu.
import { useState, type ReactElement } from "react";
import { Anchor, Box, Button, Group, Menu, Stack, Text } from "@mantine/core";
import { Ban, Check, ChevronDown, Info } from "lucide-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Panel, PanelSkeletonRows, PanelTableHead } from "@/components/Panel";
import { PANEL_HAIRLINE, PANEL_ROW_PADDING } from "@/components/panelRows";
import { RouteMap } from "@/components/RouteMap";
import { useBikes } from "@/features/bikes/bikes.queries";
import type { ListedBike } from "@/features/bikes/bikes.types";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { BikeColorDot } from "@/features/bikes/ui/BikeColorDot";
import { formatDuration } from "@/features/rides/rideDuration";
import { useDismissPendingRide, usePendingRides, useResolvePendingRide } from "@/features/strava/strava.queries";
import type { PendingRide } from "@/features/strava/strava.types";
import { GearLinkingSheet } from "./GearLinkingSheet";

const PENDING_COLUMNS = "48px minmax(0, 1fr) 88px 80px 88px 128px";
const STRAVA_GEAR_SETTINGS = "https://www.strava.com/settings/gear";
const STRAVA_ORANGE = "var(--mantine-color-strava-6)";
// Same simplification as the phone's cards, which draw the route at a similar size.
const ROW_SIMPLIFY = 1;

interface PendingRidesTableProps {
  // The ride a notification pointed at (`?pending=`).
  highlightedActivityId?: string;
}

export function PendingRidesTable({ highlightedActivityId }: PendingRidesTableProps): ReactElement {
  const { t } = useTranslation();
  const { data, isLoading, isError } = usePendingRides();
  const { data: bikes } = useBikes();
  const resolve = useResolvePendingRide();
  const dismiss = useDismissPendingRide();
  const [dismissing, setDismissing] = useState<PendingRide | null>(null);
  const [pairing, setPairing] = useState(false);
  const rides = data ?? [];

  if (isError) {
    return <Text c="red.5">{t("pendingRides.loadFailed")}</Text>;
  }

  if (!isLoading && rides.length === 0) {
    return (
      <Group gap={8} wrap="nowrap" fz={13} c="var(--color-text-dim)">
        <Check size={16} color="var(--mantine-color-primary-6)" />
        <span>{t("pendingRides.allAssigned")}</span>
      </Group>
    );
  }

  const assigningId = resolve.isPending ? resolve.variables.activityId : null;

  return (
    <Stack gap="md">
      {!isLoading && <PendingSummary rides={rides} />}
      {resolve.isError && (
        <Text fz={13} c="red.5">
          {t("pendingRides.assignFailed")}
        </Text>
      )}

      <Panel title={t("pendingRides.listTitle")} count={isLoading ? undefined : rides.length}>
        {isLoading ? (
          <PanelSkeletonRows count={3} />
        ) : (
          <>
            <PanelTableHead
              columns={PENDING_COLUMNS}
              cells={["", t("pendingRides.columnRide"), t("rides.statDistance"), t("rides.statDuration"), t("rides.statElevation"), ""]}
              rightAligned={[2, 3, 4]}
            />
            {rides.map((ride) => (
              <PendingRow
                key={ride.activity_id}
                ride={ride}
                bikes={bikes ?? []}
                highlighted={ride.activity_id === highlightedActivityId}
                assigning={assigningId === ride.activity_id}
                onAssign={(bikeId) => resolve.mutate({ activityId: ride.activity_id, bikeId })}
                onDismiss={() => setDismissing(ride)}
              />
            ))}
            <PendingFooter onPair={() => setPairing(true)} />
          </>
        )}
      </Panel>

      <ConfirmModal
        opened={dismissing !== null}
        onCancel={() => {
          dismiss.reset();
          setDismissing(null);
        }}
        onConfirm={() => {
          if (dismissing === null) return;
          dismiss.mutate(dismissing.activity_id, { onSuccess: () => setDismissing(null) });
        }}
        title={t("pendingRides.dismissTitle")}
        body={t("pendingRides.dismissBody")}
        cancelLabel={t("pendingRides.dismissCancel")}
        confirmLabel={t("pendingRides.dismissConfirm")}
        pending={dismiss.isPending}
      >
        {dismiss.isError && (
          <Text fz={13} c="red.5">
            {t("pendingRides.dismissFailed")}
          </Text>
        )}
      </ConfirmModal>

      <GearLinkingSheet opened={pairing} onClose={() => setPairing(false)} />
    </Stack>
  );
}

// What the backlog keeps out of the parts: count, distance and time.
function PendingSummary({ rides }: { rides: PendingRide[] }): ReactElement {
  const { t, i18n } = useTranslation();
  const km = rides.reduce((total, ride) => total + ride.distance_km, 0);
  const minutes = rides.reduce((total, ride) => total + ride.duration_min, 0);
  const kmLabel = new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(km);

  return (
    <Group gap={8} wrap="nowrap" fz={13} c="var(--color-text-dim)" className="tabular-nums">
      <Box w={7} h={7} style={{ borderRadius: 9999, flexShrink: 0, backgroundColor: STRAVA_ORANGE }} />
      <span>
        {t("pendingRides.summary", {
          rides: t("pendingRides.summaryCount", { count: rides.length }),
          km: kmLabel,
          time: formatDuration(minutes),
        })}
      </span>
    </Group>
  );
}

interface PendingRowProps {
  ride: PendingRide;
  bikes: ListedBike[];
  highlighted: boolean;
  assigning: boolean;
  onAssign: (bikeId: number) => void;
  onDismiss: () => void;
}

// Not clickable: the only action is the menu, so a stray click assigns nothing.
function PendingRow({ ride, bikes, highlighted, assigning, onAssign, onDismiss }: PendingRowProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Box
      style={{
        display: "grid",
        gridTemplateColumns: PENDING_COLUMNS,
        alignItems: "center",
        gap: 16,
        padding: PANEL_ROW_PADDING,
        borderTop: PANEL_HAIRLINE,
        backgroundColor: highlighted ? "color-mix(in srgb, var(--mantine-color-primary-6) 10%, transparent)" : undefined,
      }}
    >
      <RouteMap polyline={ride.summary_polyline} width={40} height={40} simplify={ROW_SIMPLIFY} />
      <Stack gap={0} style={{ minWidth: 0 }}>
        <Text fz={13} fw={600} c="text.6" lineClamp={1}>
          {ride.name || dayjs(ride.started_at).format("D. M. YYYY")}
        </Text>
        <Text className="tabular-nums" fz={12} c="var(--color-text-dim)">
          {dayjs(ride.started_at).format("D. M. YYYY H:mm")}
        </Text>
      </Stack>
      <Text className="tabular-nums" fz={13} c="text.7" ta="right">
        {t("pendingRides.distance", { count: ride.distance_km })}
      </Text>
      <Text className="tabular-nums" fz={13} c="text.7" ta="right">
        {formatDuration(ride.duration_min)}
      </Text>
      <Text className="tabular-nums" fz={13} c="text.7" ta="right">
        {`↑ ${t("pendingRides.elevation", { count: ride.elevation_up_m })}`}
      </Text>
      <Group justify="flex-end">
        <Menu position="bottom-end" radius="md" shadow="md">
          <Menu.Target>
            <Button variant="outline" radius="md" size="xs" loading={assigning} rightSection={<ChevronDown size={14} />}>
              {t("pendingRides.assignMenu")}
            </Button>
          </Menu.Target>
          <Menu.Dropdown
            bg="cards.6"
            p={8}
            style={{ border: "1px solid var(--mantine-color-cards-6)", boxShadow: "var(--elev-panel)" }}
          >
            {bikes.map((bike) => (
              <Menu.Item
                key={bike.id}
                color="text"
                fw={600}
                leftSection={<BikeColorDot colorIndex={bike.color_index} />}
                onClick={() => onAssign(bike.id)}
              >
                {bikeTitle(bike)}
              </Menu.Item>
            ))}
            <Menu.Divider style={{ borderTopColor: "var(--mantine-color-cards-5)" }} />
            <Menu.Item leftSection={<Ban size={14} />} c="var(--color-text-dim)" onClick={onDismiss}>
              {t("pendingRides.dismiss")}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Box>
  );
}

// Rides land here because Strava sent no gear, so the fixes are a default bike there or a pairing here.
function PendingFooter({ onPair }: { onPair: () => void }): ReactElement {
  const { t } = useTranslation();

  return (
    <Group gap={8} wrap="wrap" fz={12} c="var(--color-text-dim)" px="md" py="sm" style={{ borderTop: PANEL_HAIRLINE }}>
      <Info size={14} />
      <span>{t("pendingRides.footerNoGear")}</span>
      <Anchor href={STRAVA_GEAR_SETTINGS} target="_blank" rel="noreferrer" fz="inherit" c="primary.6">
        {t("pendingRides.footerStravaGear")}
      </Anchor>
      <span aria-hidden>·</span>
      <Anchor component="button" fz="inherit" c="primary.6" onClick={onPair}>
        {t("pendingRides.footerPair")}
      </Anchor>
    </Group>
  );
}
