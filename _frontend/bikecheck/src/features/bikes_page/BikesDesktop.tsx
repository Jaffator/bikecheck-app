// Desktop garage: a context line, the Active / Archived switch, then the bikes as cards or the archive as a table.
import { useCallback, useEffect, useState, type ReactElement } from "react";
import { Button, Group, SegmentedControl, Select, SimpleGrid, Skeleton, Stack, Text } from "@mantine/core";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BIKE_SORTS, parseBikeSort, sortBikes, type BikeSort } from "@/features/bikes/bikeSort";
import { useArchivedBikes, useBikes } from "@/features/bikes/bikes.queries";
import { ArchivedBikesTable } from "@/features/bikes/ui/ArchivedBikesTable";
import { BikeCard } from "@/features/bikes/ui/BikeCard";
import { CustomPartsDrawer } from "@/features/components/ui/CustomPartsDrawer";
import { EVERY_READING } from "@/features/service_tracking/attentionLevel";
import { useGarageTrackedActions } from "@/features/service_tracking/tracking.queries";
import { ADD_BIKE } from "@/layout/navItems";
import { useHeaderStore } from "@/store/store";
import { BikesContextLine } from "./BikesContextLine";
import { EmptyGarage } from "./EmptyGarage";

type BikesTab = "active" | "archived";

const SORT_LABEL_KEY: Record<BikeSort, string> = {
  health: "bikes.sortHealth",
  distance: "bikes.sortDistance",
  lastRide: "bikes.sortLastRide",
  name: "bikes.sortName",
};

// Anything but "archived" is the garage, so a broken link still opens it.
function parseBikesTab(raw: string | null): BikesTab {
  return raw === "archived" ? "archived" : "active";
}

export function BikesDesktop(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setActionSlot = useHeaderStore((state) => state.setActionSlot);
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: bikes } = useBikes();
  const { data: archived } = useArchivedBikes();
  const [managingParts, setManagingParts] = useState(false);
  // In the address, so a reload or Back keeps them; the defaults are not written.
  const tab = parseBikesTab(searchParams.get("tab"));
  const sort = parseBikeSort(searchParams.get("sort"));

  // Replaced rather than pushed, so Back leaves the garage instead of stepping through the controls.
  const setParam = useCallback(
    (key: string, value: string | null): void => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          if (value === null) params.delete(key);
          else params.set(key, value);
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // The garage's actions hang in the header beside its title - see the header store.
  useEffect(() => {
    setActionSlot(
      <Group gap="sm" wrap="nowrap">
        <Button variant="outline" radius="md" onClick={() => setManagingParts(true)}>
          {t("bikes.myParts")}
        </Button>
        <Button
          color="primary.6"
          c="textDark.6"
          radius="md"
          leftSection={<Plus size={16} />}
          onClick={() => navigate(ADD_BIKE.path)}
        >
          {t(ADD_BIKE.labelKey)}
        </Button>
      </Group>,
    );
    return () => setActionSlot(null);
  }, [setActionSlot, t, navigate]);

  const activeCount = bikes?.length ?? 0;
  const archivedCount = archived?.length ?? 0;

  return (
    // No top padding: the context line belongs to the header's title just above it.
    <Stack gap="md" p="md" pt={0}>
      <BikesContextLine activeCount={activeCount} archivedCount={archivedCount} />

      <Group justify="space-between" wrap="nowrap">
        <SegmentedControl
          value={tab}
          onChange={(next) => setParam("tab", parseBikesTab(next) === "archived" ? "archived" : null)}
          radius="md"
          withItemsBorders={false}
          // The theme dims every label; the chosen tab reads bright.
          classNames={{ label: "tabular-nums data-[active]:!text-[var(--mantine-color-text-6)] data-[active]:font-bold" }}
          data={[
            { value: "active", label: t("bikes.tabActive", { count: activeCount }) },
            { value: "archived", label: t("bikes.tabArchived", { count: archivedCount }) },
          ]}
        />
        {tab === "active" && (
          <Group gap="sm" wrap="nowrap">
            <Text fz={13} c="var(--color-text-dim)">
              {t("bikes.sortBy")}
            </Text>
            <Select
              value={sort}
              onChange={(next) => setParam("sort", next === null || next === "health" ? null : next)}
              data={BIKE_SORTS.map((value) => ({ value, label: t(SORT_LABEL_KEY[value]) }))}
              allowDeselect={false}
              aria-label={t("bikes.sortBy")}
              radius="md"
              w={180}
            />
          </Group>
        )}
      </Group>

      {tab === "archived" ? <ArchivedBikesTable /> : <ActiveBikes sort={sort} archivedCount={archivedCount} />}

      <CustomPartsDrawer opened={managingParts} onClose={() => setManagingParts(false)} />
    </Stack>
  );
}

function ActiveBikes({ sort, archivedCount }: { sort: BikeSort; archivedCount: number }): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: bikes, isLoading, isError } = useBikes();
  const { data: actions } = useGarageTrackedActions(EVERY_READING);

  if (isLoading) {
    return (
      <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="md">
        {[0, 1, 2].map((slot) => (
          <Skeleton key={slot} h={300} radius="lg" />
        ))}
      </SimpleGrid>
    );
  }

  if (isError) {
    return <Text c="red.5">{t("bikes.loadFailed")}</Text>;
  }

  // The switch above already leads to the archive, so the empty state offers no door of its own.
  if (!bikes || bikes.length === 0) {
    return <EmptyGarage archivedCount={archivedCount} />;
  }

  return (
    // The photo keeps its aspect, so a wider column grows the whole card rather than cropping it.
    <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="md">
      {sortBikes(bikes, sort, actions ?? []).map((bike) => (
        <BikeCard key={bike.id} bike={bike} onOpen={() => navigate(`/bikes/${String(bike.id)}`)} />
      ))}
    </SimpleGrid>
  );
}
