// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useEffect, useState, type ReactElement } from "react";
import { Group, Paper, Skeleton, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Archive } from "lucide-react";
import { useBike, useArchiveBike } from "@/features/bikes/bikes.queries";
import { useBikeRideCount } from "@/features/rides/rides.queries";
import { useHistoryTotals } from "@/features/service/service.queries";
import { usePendingRides } from "@/features/strava/strava.queries";
import { ALL_TIME } from "@/features/service/servicePeriod";
import { formatCost } from "@/utils/money";
import { GearLinkingSheet } from "@/features/strava/ui/GearLinkingSheet";
import { useLinkStravaGear } from "@/features/strava/strava.queries";
import { useCurrentUser } from "@/features/users/users.queries";
import { BikeActionTiles } from "@/features/bikes/ui/BikeActionTiles";
import { BikeExportButton } from "@/features/bikes/ui/BikeExportButton";
import { BikeHeroCard } from "@/features/bikes/ui/BikeHeroCard";
import { ShareDrawer } from "@/features/profile/ui/ShareDrawer";
import { useOpenLinkCount } from "@/features/report/report.queries";
import { TrackedActionsSection } from "@/features/service_tracking/ui/TrackedActionsSection";
import { useBikeTrackedActions } from "@/features/service_tracking/tracking.queries";
import { BikeSpecsDrawer } from "@/features/bikes/ui/BikeSpecsDrawer";
import { BikeComponentsSection } from "@/features/components/ui/BikeComponentsSection";
import { CustomPartsDrawer } from "@/features/components/ui/CustomPartsDrawer";
import { useCustomComponentTypes } from "@/features/components/components.queries";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { bikeFigures } from "@/features/bikes/bikeFigures";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ExportSheet } from "@/features/report/ui/ExportSheet";
import type { ExportReportInput } from "@/features/report/report.types";
import { useHeaderStore } from "@/store/store";
import { BikeActionsMenu } from "@/features/bikes/ui/BikeActionsMenu";
import { TRANSPARENT_HEADER_CONTROL } from "@/layout/headerControl";
import { useIsDesktop } from "@/layout/breakpoints";
import { BikeDetailBreadcrumbs, BikeDetailDesktop, BikeDetailHeaderActions } from "./BikeDetailDesktop";

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
  // The parts the owner named themselves - a catalogue list, so the row shows only once
  // there is something in it (ADR 0021).
  const [managingParts, setManagingParts] = useState(false);
  const { data: customTypes } = useCustomComponentTypes();
  const hasCustomTypes = (customTypes?.length ?? 0) > 0;
  // What the export button is exporting. Null keeps the export sheet shut.
  const [exporting, setExporting] = useState<ExportReportInput | null>(null);
  // The full spec list, which is read once and then left alone.
  const [showingSpecs, setShowingSpecs] = useState(false);
  // Whether the bike is on the owner's profile is switched in the share drawer.
  const [sharing, setSharing] = useState(false);
  const archive = useArchiveBike();
  const unpair = useLinkStravaGear();
  const openLinks = useOpenLinkCount(Number(id));
  const setActionSlot = useHeaderStore((state) => state.setActionSlot);
  const setHeaderTransparent = useHeaderStore((state) => state.setHeaderTransparent);
  const setTitleSlot = useHeaderStore((state) => state.setTitleSlot);
  const setBackHidden = useHeaderStore((state) => state.setBackHidden);
  const isDesktop = useIsDesktop();

  // An Archived Bike is a frozen record: readable, exportable, and written to by nothing.
  const archived = bike?.is_deleted === true;

  // What archiving costs, read before it is agreed to rather than discovered afterwards.
  // All three come from what the bike's own screens already serve.
  const { data: totals } = useHistoryTotals(bike?.id, ALL_TIME);
  // Read with the page, not when the dialog opens: a body that first says "0 rides" and
  // corrects itself is a sentence the owner can agree to while it is still wrong.
  const { data: rideCount } = useBikeRideCount(bike?.id ?? null);
  const { data: pendingRides } = usePendingRides();
  // Feeds the badge over the photo. The section below reads the same key, so the two are
  // one request and can never disagree.
  const { data: trackedActions } = useBikeTrackedActions(bike?.id ?? null);
  const pendingForBike =
    bike?.strava_gear_id == null ? 0 : (pendingRides ?? []).filter((ride) => ride.gear_id === bike.strava_gear_id).length;

  // The phone page leads with its photo, so the header steps out of the way of it; desktop does not.
  useEffect(() => {
    setHeaderTransparent(!isDesktop);
    return () => setHeaderTransparent(false);
  }, [setHeaderTransparent, isDesktop]);

  // Desktop reads its place in the app from breadcrumbs, so it has no back arrow.
  useEffect(() => {
    if (!isDesktop) return;
    setTitleSlot(<BikeDetailBreadcrumbs />);
    setBackHidden(true);
    return () => {
      setTitleSlot(null);
      setBackHidden(false);
    };
  }, [isDesktop, setTitleSlot, setBackHidden]);

  // The header carries what is run rarely, out from under the scrolling thumb; desktop adds its
  // main acts beside the menu.
  useEffect(() => {
    if (!bike) return;

    // Nothing in the menu applies to an Archived Bike: unarchiving and destroying it are
    // offered from the archive, and everything else is a write.
    const menu = archived ? null : (
      <BikeActionsMenu
        onEdit={isDesktop ? undefined : () => navigate(`/bikes/${String(bike.id)}/edit`)}
        onUnpair={bike.strava_gear_id === null ? undefined : () => setConfirmingUnpair(true)}
        onManageParts={hasCustomTypes ? () => setManagingParts(true) : undefined}
        onArchive={() => setConfirmingArchive(true)}
        targetStyle={isDesktop ? undefined : TRANSPARENT_HEADER_CONTROL}
      />
    );
    setActionSlot(
      isDesktop ? <BikeDetailHeaderActions bikeId={bike.id} archived={archived} menu={menu} /> : menu,
    );

    return () => setActionSlot(null);
  }, [setActionSlot, navigate, bike, archived, hasCustomTypes, isDesktop]);

  // Show loading state for deep links without cached garage data.
  if (isLoading) {
    return (
      <Stack gap="md" px="var(--page-inset)" pt="md">
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

  // Desktop lays the same pieces out in columns - see BikeDetailDesktop.
  const phoneContent = (
    <>
      <BikeHeroCard
        bike={bike}
        trackedActions={trackedActions ?? []}
        archived={archived}
        onOpenSpecs={() => setShowingSpecs(true)}
        onPairGear={() => setPairingGear(true)}
        onOpenSharing={() => setSharing(true)}
      />
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

      <BikeExportButton onExport={() => setExporting({ kind: "BIKE", bike_id: bike.id })} />

      <BikeActionTiles
        onAddService={archived ? undefined : () => navigate(`/service/new?bike=${String(bike.id)}`)}
        onOpenHistory={() => navigate(`/bikes/${String(bike.id)}/history`)}
        onOpenSetup={() => navigate(`/bikes/${String(bike.id)}/setup`)}
        onOpenLinks={() => navigate(`/reports?bike=${String(bike.id)}`)}
        openLinks={openLinks}
      />

      {/* What the bike still owes, above what it is made of: the readings are what the
          owner came to check, the build is read less often. */}
      <TrackedActionsSection bikeId={bike.id} />

      {/* What the machine is made of, under what can be done with it: the tiles are the
          daily act, the build is read less often. */}
      <BikeComponentsSection bikeId={bike.id} ebike={bike.ebike} readOnly={archived} />
    </>
  );

  return (
    <Stack
      gap="md"
      // Desktop lines up with the header's xl inset, like the garage.
      px={isDesktop ? "xl" : "var(--page-inset)"}
      // Clears the transparent header, which no longer holds a place open for the page.
      pt={isDesktop ? "md" : "calc(3rem + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 0.4rem)"}
      pb={isDesktop ? 96 : "calc(2rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))"}
    >
      {isDesktop ? (
        <BikeDetailDesktop
          bike={bike}
          trackedActions={trackedActions ?? []}
          archived={archived}
          openLinks={openLinks}
          onOpenSpecs={() => setShowingSpecs(true)}
          onExport={() => setExporting({ kind: "BIKE", bike_id: bike.id })}
          onPairGear={() => setPairingGear(true)}
          onOpenSharing={() => setSharing(true)}
        />
      ) : (
        phoneContent
      )}

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

      <ShareDrawer opened={sharing} onClose={() => setSharing(false)} />

      <CustomPartsDrawer opened={managingParts} onClose={() => setManagingParts(false)} />

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
          km: bikeFigures(bike).km,
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

