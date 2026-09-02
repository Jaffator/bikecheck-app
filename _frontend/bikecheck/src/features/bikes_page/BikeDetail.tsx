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
  Info,
  MoreVertical,
  Pencil,
  Ruler,
  Trash2,
  Unlink,
  Weight,
} from "lucide-react";
import { useBike, useDeleteBike } from "../bikes/bikes.queries";
import { GearLinkingSheet } from "../strava/GearLinkingSheet";
import { useConnectStrava, useLinkStravaGear } from "../strava/strava.queries";
import { useCurrentUser } from "../users/users.queries";
import { BikePhoto } from "./BikePhoto";
import { BikeActionTiles } from "./BikeActionTiles";
import { BikeStravaCard } from "./BikeStravaCard";
import { HealthBadge } from "./HealthBadge";
import { StravaLinkedBadge } from "./StravaLinkedBadge";
import { BikeSpecsDrawer } from "./BikeSpecsDrawer";
import { bikeTitle } from "../bikes/bikeTitle";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ExportSheet } from "@/features/report/ExportSheet";
import type { ExportReportInput } from "@/features/report/report.types";
import { useHeaderStore } from "@/store/store";

// One hue per reading, so the line is read by colour before it is read by number. The
// green is the one the health badge already uses; the yellow is the brand's own. The
// Strava orange stays reserved for Strava, so the ride time takes a warmer orange of its
// own. All five clear 4.5:1 on the card.
const METRIC_COLORS = {
  distance: "#4ADE80",
  elevation: "#60A5FA",
  time: "#FB923C",
  size: "var(--mantine-color-primary-6)",
  weight: "var(--color-accent)",
} as const;

// The machine's own page: what it is, what it has done, and what can be done with it.
export function BikeDetail(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { data: bike, isLoading, isError } = useBike(Number(id));
  const { data: user } = useCurrentUser();
  const [pairingGear, setPairingGear] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Unpairing is destructive enough to ask about, and the question is where the note about
  // rides staying finally has room to be read.
  const [confirmingUnpair, setConfirmingUnpair] = useState(false);
  // What the export button is exporting. Null keeps the export sheet shut.
  const [exporting, setExporting] = useState<ExportReportInput | null>(null);
  // The full spec list, which is read once and then left alone.
  const [showingSpecs, setShowingSpecs] = useState(false);
  const remove = useDeleteBike();
  const unpair = useLinkStravaGear();
  const connect = useConnectStrava();
  const setActionSlot = useHeaderStore((state) => state.setActionSlot);
  const setHeaderTransparent = useHeaderStore((state) => state.setHeaderTransparent);

  const paired = bike?.strava_gear_id != null;

  // The page leads with its photo, so the header steps out of the way of it.
  useEffect(() => {
    setHeaderTransparent(true);
    return () => setHeaderTransparent(false);
  }, [setHeaderTransparent]);

  // The header carries what is run rarely: correcting the bike, detaching it, throwing it
  // away. None of them belong under the thumb that is scrolling.
  useEffect(() => {
    if (!bike) return;

    setActionSlot(
      <Menu position="bottom-end" radius="md" withinPortal>
        <Menu.Target>
          <ActionIcon variant="transparent" radius="xl" size="lg" aria-label={t("bikes.cardMenu")}>
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

          <Menu.Item
            color="red.5"
            py={12}
            fw={600}
            leftSection={<Trash2 size={18} />}
            onClick={() => setConfirmingDelete(true)}
          >
            {t("bikes.delete")}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>,
    );

    return () => setActionSlot(null);
  }, [setActionSlot, t, navigate, bike]);

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
      {/* The specs are read once and the actions daily, so the list stays behind a row
          rather than pushing the tiles below the fold. */}
      <UnstyledButton
        onClick={() => setShowingSpecs(true)}
        px="md"
        py={12}
        style={{
          borderRadius: "var(--mantine-radius-lg)",
          backgroundColor: "var(--mantine-color-cards-6)",
          border: "1px solid var(--color-border-subtle)",
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
      {!paired && (
        <BikeStravaCard
          accountConnected={user?.strava_athlete_id != null}
          onConnectAccount={() => connect.mutate()}
          onPairGear={() => setPairingGear(true)}
          connectFailed={connect.isError}
        />
      )}

      <BikeActionTiles
        onAddService={() => navigate(`/service/new?bike=${String(bike.id)}`)}
        onExportReport={() => setExporting({ kind: "BIKECHECK", bike_id: bike.id })}
        onOpenReports={() => navigate(`/reports?bike=${String(bike.id)}`)}
        onOpenHistory={() => navigate(`/service/history?bike=${String(bike.id)}`)}
      />

      {remove.isError && (
        <Text size="xs" c="red.5">
          {t("bikes.deleteFailed")}
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

      <ConfirmModal
        opened={confirmingDelete}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() =>
          remove.mutate(bike.id, {
            // Replace detail history with the garage: back must not return to a bike
            // that is no longer there.
            onSuccess: () => {
              setConfirmingDelete(false);
              navigate("/bikes", { replace: true });
            },
          })
        }
        title={t("bikes.deleteConfirmTitle")}
        body={t("bikes.deleteConfirmBody")}
        cancelLabel={t("bikes.deleteConfirmCancel")}
        confirmLabel={t("bikes.delete")}
        pending={remove.isPending}
      />
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
