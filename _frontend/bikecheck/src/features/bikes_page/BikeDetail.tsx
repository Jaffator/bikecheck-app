// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useEffect, useState, type ReactElement } from "react";
import { ActionIcon, Box, Menu, Paper, Skeleton, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { MoreVertical, Pencil, Trash2, Unlink } from "lucide-react";
import { useBike, useDeleteBike } from "../bikes/bikes.queries";
import { GearLinkingSheet } from "../strava/GearLinkingSheet";
import { useConnectStrava, useLinkStravaGear } from "../strava/strava.queries";
import { useCurrentUser } from "../users/users.queries";
import { BikePhoto } from "./BikePhoto";
import { BikeActionTiles } from "./BikeActionTiles";
import { BikeMetricsCard } from "./BikeMetricsCard";
import { BikeStravaCard } from "./BikeStravaCard";
import { HealthBadge } from "./HealthBadge";
import { bikeTitle, splitBikeTitle } from "../bikes/bikeTitle";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ExportSheet } from "@/features/report/ExportSheet";
import type { ExportReportInput } from "@/features/report/report.types";
import { useHeaderStore } from "@/store/store";

// The machine's own page: what it is, what it has done, and what can be done with it.
export function BikeDetail(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: bike, isLoading, isError } = useBike(Number(id));
  const { data: user } = useCurrentUser();
  const [pairingGear, setPairingGear] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Unpairing is destructive enough to ask about, and the question is where the note about
  // rides staying finally has room to be read.
  const [confirmingUnpair, setConfirmingUnpair] = useState(false);
  // What the export button is exporting. Null keeps the export sheet shut.
  const [exporting, setExporting] = useState<ExportReportInput | null>(null);
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
          style={{ border: "1px solid var(--mantine-color-cards-5)", boxShadow: "var(--elev-panel)" }}
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
            <Menu.Item color="text" py={12} fw={600} leftSection={<Unlink size={18} />} onClick={() => setConfirmingUnpair(true)}>
              {t("strava.unpairBike")}
            </Menu.Item>
          )}

          <Menu.Item color="red.5" py={12} fw={600} leftSection={<Trash2 size={18} />} onClick={() => setConfirmingDelete(true)}>
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
        <Skeleton h={14} w="30%" radius="sm" />
        <Skeleton h={28} w="65%" radius="sm" />
        {/* Match the photo slot, so the loaded hero lands where the skeleton stood. */}
        <Skeleton radius="md" style={{ aspectRatio: 2 }} />
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

  const { kicker, heading } = splitBikeTitle(bike);

  return (
    <Stack
      gap="md"
      px="md"
      // Clears the transparent header, which no longer holds a place open for the page.
      pt="calc(3.5rem + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 0.5rem)"
      pb="calc(2rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))"
    >
      {/* The bike, read the way it is written on the frame. */}
      <Stack gap={2}>
        {kicker !== null && (
          <Text className="font-mono uppercase" fz={11} fw={400} c="var(--color-text-dim)" lts="0.08em" lineClamp={1}>
            {kicker}
          </Text>
        )}
        <Text fw={700} fz={24} c="text.6" lh={1.2} lineClamp={2}>
          {heading}
        </Text>
        {/* The garage and this page are the only places a bike answers to its nickname. */}
        {bike.bikename !== null && bike.bikename !== "" && (
          <Text className="font-mono" fz={11} tt="uppercase" c="var(--color-text-dim)" lineClamp={1}>
            {bike.bikename}
          </Text>
        )}
      </Stack>

      {/* The name is carried above, so the photo is left bare but for its badge. */}
      <Paper radius="lg" style={{ overflow: "hidden" }}>
        <BikePhoto imageUrl={bike.image_url} title={bikeTitle(bike)} subtitle={null} titleSize={24} showCaption={false}>
          <Box style={{ marginRight: "auto" }}>
            <HealthBadge readings={[]} />
          </Box>
        </BikePhoto>
      </Paper>

      <BikeMetricsCard bike={bike} onEditWeight={() => navigate(`/bikes/${String(bike.id)}/edit`)} />

      <BikeStravaCard
        bike={bike}
        accountConnected={user?.strava_athlete_id != null}
        onConnectAccount={() => connect.mutate()}
        onPairGear={() => setPairingGear(true)}
        connectFailed={connect.isError}
      />

      <BikeActionTiles
        paired={paired}
        onAddService={() => navigate(`/service/new?bike=${String(bike.id)}`)}
        onExportReport={() => setExporting({ kind: "BIKECHECK", bike_id: bike.id })}
        onOpenReports={() => navigate(`/reports?bike=${String(bike.id)}`)}
        onPairGear={() => setPairingGear(true)}
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

      <ExportSheet input={exporting} onClose={() => setExporting(null)} />

      <GearLinkingSheet opened={pairingGear} onClose={() => setPairingGear(false)} bikeIds={[bike.id]} />

      {/* Detaching keeps the rides already recorded, which the question is the only place
          with room to say. */}
      <ConfirmModal
        opened={confirmingUnpair}
        onCancel={() => setConfirmingUnpair(false)}
        onConfirm={() =>
          unpair.mutate([{ bikecheckBikeId: bike.id, stravaBikeId: null }], {
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
