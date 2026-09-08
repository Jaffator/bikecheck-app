// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useEffect, useState, type ReactElement } from "react";
import { ActionIcon, Group, Menu, Paper, Skeleton, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowUpRight,
  ChevronRight,
  Clock,
  Gauge,
  Archive,
  Info,
  MoreVertical,
  Pencil,
  Ruler,
  Unlink,
  Weight,
} from "lucide-react";
import { useBike, useArchiveBike } from "../bikes/bikes.queries";
import { useBikeRideCount } from "../rides/rides.queries";
import { useHistoryTotals } from "../service/service.queries";
import { usePendingRides } from "../strava/strava.queries";
import { ALL_TIME } from "../service/servicePeriod";
import { formatCost } from "@/utils/money";
import { GearLinkingSheet } from "../strava/GearLinkingSheet";
import { useConnectStrava, useLinkStravaGear } from "../strava/strava.queries";
import { useCurrentUser } from "../users/users.queries";
import { BikePhoto } from "./BikePhoto";
import { BikeActionTiles } from "./BikeActionTiles";
import { BikeStravaCard } from "./BikeStravaCard";
import { HealthBadge } from "./HealthBadge";
import { StravaLinkedBadge } from "./StravaLinkedBadge";
import { BikeSpecsDrawer } from "./BikeSpecsDrawer";
import { BikeComponentsSection } from "./BikeComponentsSection";
import { bikeTitle } from "../bikes/bikeTitle";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ExportSheet } from "@/features/report/ExportSheet";
import type { ExportReportInput } from "@/features/report/report.types";
import { useHeaderStore } from "@/store/store";
import { TRANSPARENT_HEADER_CONTROL } from "@/layout/AppLayout";

// One hue per reading, so the line is read by colour before it is read by number. The
// green is the one the health badge already uses; the yellow is the brand's own. The
// Strava orange stays reserved for Strava, so the ride time takes a warmer orange of its
// own. All five clear 4.5:1 on the card.
const METRIC_COLORS = {
  distance: "var(--mantine-color-text-8)",
  elevation: "var(--mantine-color-text-8)",
  time: "var(--mantine-color-text-8)",
  size: "var(--mantine-color-text-8)",
  weight: "var(--mantine-color-text-8)",
} as const;

// The machine's own page: what it is, what it has done, and what can be done with it.
export function BikeDetail(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { data: bike, isLoading, isError } = useBike(Number(id));
  const { data: user } = useCurrentUser();
  const [pairingGear, setPairingGear] = useState(false);
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  // Unpairing is destructive enough to ask about, and the question is where the note about
  // rides staying finally has room to be read.
  const [confirmingUnpair, setConfirmingUnpair] = useState(false);
  // What the export button is exporting. Null keeps the export sheet shut.
  const [exporting, setExporting] = useState<ExportReportInput | null>(null);
  // The full spec list, which is read once and then left alone.
  const [showingSpecs, setShowingSpecs] = useState(false);
  const archive = useArchiveBike();
  const unpair = useLinkStravaGear();
  const connect = useConnectStrava();
  const setActionSlot = useHeaderStore((state) => state.setActionSlot);
  const setHeaderTransparent = useHeaderStore((state) => state.setHeaderTransparent);

  const paired = bike?.strava_gear_id != null;
  // An Archived Bike is a frozen record: readable, exportable, and written to by nothing.
  const archived = bike?.is_deleted === true;

  // What archiving costs, read before it is agreed to rather than discovered afterwards.
  // All three come from what the bike's own screens already serve.
  const { data: totals } = useHistoryTotals(bike?.id, ALL_TIME);
  const { data: rideCount } = useBikeRideCount(confirmingArchive && bike ? bike.id : null);
  const { data: pendingRides } = usePendingRides();
  const pendingForBike =
    bike?.strava_gear_id == null ? 0 : (pendingRides ?? []).filter((ride) => ride.gear_id === bike.strava_gear_id).length;

  // The page leads with its photo, so the header steps out of the way of it.
  useEffect(() => {
    setHeaderTransparent(true);
    return () => setHeaderTransparent(false);
  }, [setHeaderTransparent]);

  // The header carries what is run rarely: correcting the bike, detaching it, throwing it
  // away. None of them belong under the thumb that is scrolling.
  useEffect(() => {
    // Nothing in the menu applies to an Archived Bike: unarchiving and destroying it are
    // offered from the archive, and everything else is a write.
    if (!bike || archived) return;

    setActionSlot(
      <Menu position="bottom-end" radius="md" withinPortal>
        <Menu.Target>
          <ActionIcon
            variant="transparent"
            radius="xl"
            size="lg"
            aria-label={t("bikes.cardMenu")}
            style={TRANSPARENT_HEADER_CONTROL}
          >
            <MoreVertical size={22} color="var(--mantine-color-text-6)" />
          </ActionIcon>
        </Menu.Target>

        {/* Wears the same surface as the Reports menu, so the app has one dropdown. */}
        <Menu.Dropdown
          bg="cards.6"
          p={8}
          style={{
            border: "1px solid var(--mantine-color-cards-6)",
            boxShadow: "var(--elev-panel)",
          }}
        >
          <Menu.Item
            color="text"
            py={12}
            fw={600}
            leftSection={<Pencil size={18} />}
            onClick={() => navigate(`/bikes/${String(bike.id)}/edit`)}
          >
            {t("bikes.edit")}
          </Menu.Item>

          {/* Only a paired bike can be detached, so an unpaired one is not offered it. */}
          {bike.strava_gear_id !== null && (
            <Menu.Item
              color="text"
              py={12}
              fw={600}
              leftSection={<Unlink size={18} />}
              onClick={() => setConfirmingUnpair(true)}
            >
              {t("strava.unpairBike")}
            </Menu.Item>
          )}

          {/* Archiving is the only way out of the garage; destroying the bike is offered
              in the archive alone, never one tap from this page (ADR 0024). */}
          <Menu.Item
            color="red.5"
            py={12}
            fw={600}
            leftSection={<Archive size={18} />}
            onClick={() => setConfirmingArchive(true)}
          >
            {t("bikes.archive")}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>,
    );

    return () => setActionSlot(null);
  }, [setActionSlot, t, navigate, bike, archived]);

  // Show loading state for deep links without cached garage data.
  if (isLoading) {
    return (
      <Stack gap="md" px="md" pt="md">
        {/* Match the photo slot, so the loaded hero lands where the skeleton stood. */}
        <Skeleton radius="md" style={{ aspectRatio: 2 }} />
        <Skeleton h={14} w="30%" radius="sm" />
        <Skeleton h={28} w="65%" radius="sm" />
        <Skeleton h={92} radius="lg" />
      </Stack>
    );
  }

  if (isError || !bike) {
    return (
      <Text m="md" c="red">
        {t("bikes.loadFailed")}
      </Text>
    );
  }

  // Both are the owner's to fill in, so the frame line appears only once one of them is.
  const hasSize = bike.bike_size !== null && bike.bike_size !== "";
  const hasWeight = bike.bike_weight_kg !== null;

  return (
    <Stack
      gap="md"
      px="md"
      // Clears the transparent header, which no longer holds a place open for the page.
      pt="calc(3.5rem + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 0.4rem)"
      pb="calc(2rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))"
    >
      {/* The bike, read the way it is written on the frame: photo and name are one object,
          so they sit on one card rather than two stacked surfaces. */}
      <Paper
        radius="lg"
        style={{
          overflow: "hidden",
          backgroundColor: "var(--mantine-color-cards-6)",
          backgroundImage: "var(--card-glow)",
          border: "none",
          boxShadow: "var(--elev-hero)",
        }}
      >
        {/* The name is carried below, so the photo is left bare but for its badge. */}
        <BikePhoto imageUrl={bike.image_url} title={bikeTitle(bike)} subtitle={null} titleSize={24} showCaption={false}>
          {/* The same corner, in the same order, as the garage card keeps its badges. */}
          <Stack gap={6} align="flex-end">
            <HealthBadge readings={[]} />
            <StravaLinkedBadge stravaGearId={bike.strava_gear_id} />
          </Stack>
        </BikePhoto>

        <Stack gap={8} p="md">
          {/* The name leads and holds one line: brand, model and year are one label. */}
          <Stack gap={2}>
            <Text fw={700} fz={24} c="text.6" lh={1.2} lineClamp={1}>
              {bikeTitle(bike)}
            </Text>
            {/* The garage and this page are the only places a bike answers to its nickname. */}
            {bike.bikename !== null && bike.bikename !== "" && (
              <Text className="font-mono" fz={11} tt="uppercase" c="var(--color-text-dim)" lineClamp={1}>
                {bike.bikename}
              </Text>
            )}
          </Stack>

          {/* Everything the bike is and has done, on one line: units only, so the icon and
              its colour carry what each number is. It folds onto a second line rather than
              running off a narrow screen. */}
          <Group gap="md" wrap="wrap">
            <Metric
              icon={<Gauge size={14} color={METRIC_COLORS.distance} />}
              value={t("bikes.kilometres", { count: bike.total_km ?? 0 })}
            />
            <Metric
              icon={<ArrowUpRight size={14} color={METRIC_COLORS.elevation} />}
              value={t("bikes.metres", { count: bike.total_elevation_m ?? 0 })}
            />
            <Metric
              icon={<Clock size={14} color={METRIC_COLORS.time} />}
              value={t("bikes.hours", {
                count: Math.round((bike.total_time_min ?? 0) / 60),
              })}
            />
            {/* The frame's own figures, which the owner fills in or leaves empty. */}
            {hasSize && <Metric icon={<Ruler size={14} color={METRIC_COLORS.size} />} value={bike.bike_size ?? ""} />}
            {hasWeight && (
              <Metric
                icon={<Weight size={14} color={METRIC_COLORS.weight} />}
                value={t("bikes.kilograms", {
                  // The language writes its own decimal mark - 7,25 kg, not 7.25 kg.
                  weight: new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 }).format(
                    bike.bike_weight_kg ?? 0,
                  ),
                })}
              />
            )}
          </Group>
        </Stack>
      </Paper>
      {/* Says plainly what this page now is, so nobody looks for the actions that are gone. */}
      {archived && (
        <Paper
          radius="lg"
          p="md"
          style={{
            backgroundColor: "var(--mantine-color-cards-6)",
            backgroundImage: "var(--card-glow)",
            boxShadow: "var(--elev-row)",
          }}
        >
          <Group gap={8} wrap="nowrap" align="flex-start">
            <Archive size={16} color="var(--color-text-dim)" style={{ flexShrink: 0, marginTop: 2 }} />
            <Stack gap={2}>
              <Text fz={13} fw={600} c="text.6">
                {t("bikes.archivedTitle")}
              </Text>
              <Text fz={12} c="var(--color-text-dim)" style={{ lineHeight: 1.45 }}>
                {t("bikes.archivedBody")}
              </Text>
            </Stack>
          </Group>
        </Paper>
      )}

      {/* The specs are read once and the actions daily, so the list stays behind a row
          rather than pushing the tiles below the fold. */}
      <UnstyledButton
        onClick={() => setShowingSpecs(true)}
        px="md"
        py={15}
        style={{
          borderRadius: "var(--mantine-radius-lg)",
          backgroundColor: "var(--mantine-color-cards-6)",
          backgroundImage: "var(--card-glow)",
          boxShadow: "var(--elev-row)",
          color: "var(--mantine-color-text-6)",
          cursor: "pointer",
          transition: "transform 120ms ease",
        }}
      >
        <Group justify="space-between" wrap="nowrap">
          <Group gap={8} wrap="nowrap">
            <Info size={16} color="var(--color-text-dim)" />
            <Text fz={13} fw={600} c="text.6">
              {t("bikes.specsAction")}
            </Text>
          </Group>
          <ChevronRight size={16} color="var(--color-text-dim)" />
        </Group>
      </UnstyledButton>

      {/* A paired bike has nothing left to ask of Strava, so the card goes away — which
          gear it answers to is read in the spec sheet. */}
      {!paired && !archived && (
        <BikeStravaCard
          accountConnected={user?.strava_athlete_id != null}
          onConnectAccount={() => connect.mutate()}
          onPairGear={() => setPairingGear(true)}
          connectFailed={connect.isError}
        />
      )}

      <BikeActionTiles
        onAddService={archived ? undefined : () => navigate(`/service/new?bike=${String(bike.id)}`)}
        onExportReport={() => setExporting({ kind: "BIKECHECK", bike_id: bike.id })}
        onOpenReports={() => navigate(`/reports?bike=${String(bike.id)}`)}
        onOpenHistory={() => navigate(`/service/history?bike=${String(bike.id)}`)}
      />

      {/* What the machine is made of, under what can be done with it: the tiles are the
          daily act, the build is read less often. */}
      <BikeComponentsSection bikeId={bike.id} ebike={bike.ebike} readOnly={archived} />

      {archive.isError && (
        <Text size="xs" c="red.5">
          {t("bikes.archiveFailed")}
        </Text>
      )}

      {unpair.isError && (
        <Text size="xs" c="red.5">
          {t("strava.unpairFailed")}
        </Text>
      )}

      <BikeSpecsDrawer opened={showingSpecs} onClose={() => setShowingSpecs(false)} bike={bike} />

      <ExportSheet input={exporting} onClose={() => setExporting(null)} />

      <GearLinkingSheet opened={pairingGear} onClose={() => setPairingGear(false)} bikeIds={[bike.id]} />

      {/* Detaching keeps the rides already recorded, which the question is the only place
          with room to say. */}
      <ConfirmModal
        opened={confirmingUnpair}
        onCancel={() => setConfirmingUnpair(false)}
        onConfirm={() =>
          unpair.mutate([{ bikecheckBikeId: bike.id, stravaBikeId: null, stravaBikeName: null }], {
            onSuccess: () => setConfirmingUnpair(false),
          })
        }
        title={t("strava.unpairConfirmTitle")}
        body={t("strava.unpairBikeNote")}
        cancelLabel={t("strava.unpairConfirmCancel")}
        confirmLabel={t("strava.unpairBike")}
        pending={unpair.isPending}
      />

      {/* Everything archiving costs, said before it is agreed to: what stops counting,
          where the bike goes, that Strava is unpaired for good, and how many rides waiting
          on its gear are discarded (ADR 0024). */}
      <ConfirmModal
        opened={confirmingArchive}
        onCancel={() => setConfirmingArchive(false)}
        onConfirm={() =>
          archive.mutate(bike.id, {
            // Replace detail history with the garage: back must not return to a bike
            // that is no longer there.
            onSuccess: () => {
              setConfirmingArchive(false);
              navigate("/bikes", { replace: true });
            },
          })
        }
        title={t("bikes.archiveConfirmTitle", { name: bikeTitle(bike) })}
        // The ride count carries the plural, so the whole sentence inflects with it.
        body={t("bikes.archiveConfirmBody", {
          count: rideCount ?? 0,
          spend: formatCost(totals?.total_cost ?? 0, user?.currency ?? null, i18n.language),
          km: bike.total_km ?? 0,
        })}
        cancelLabel={t("bikes.archiveConfirmCancel")}
        confirmLabel={t("bikes.archive")}
        pending={archive.isPending}
      >
        <Stack gap={6}>
          <Text fz={12} c="var(--color-text-dim)" style={{ lineHeight: 1.45 }}>
            {t("bikes.archiveConfirmWhere")}
          </Text>
          <Text fz={12} c="var(--color-text-dim)" style={{ lineHeight: 1.45 }}>
            {t("bikes.archiveConfirmStrava")}
          </Text>
          {pendingForBike > 0 && (
            <Text fz={12} c="var(--color-text-dim)" style={{ lineHeight: 1.45 }}>
              {t("bikes.archiveConfirmPending", { count: pendingForBike })}
            </Text>
          )}
        </Stack>
      </ConfirmModal>
    </Stack>
  );
}

function Metric({ icon, value }: { icon: ReactElement; value: string }): ReactElement {
  return (
    <Group gap={6} wrap="nowrap">
      {icon}
      <Text className="font-mono" fz={13} c="text.6" lineClamp={1}>
        {value}
      </Text>
    </Group>
  );
}
