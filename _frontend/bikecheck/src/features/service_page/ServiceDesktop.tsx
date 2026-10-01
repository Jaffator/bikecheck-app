// Desktop Service: a context line, filters, three figures, Naplánováno, K servisu and the paged history on one page.
import { useEffect, useState, type ReactElement } from "react";
import { Box, Button, Group, Loader, Stack, Tooltip } from "@mantine/core";
import { Download, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useBikes } from "@/features/bikes/bikes.queries";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { BikeFilterChip } from "@/features/bikes/ui/BikeFilterChip";
import type { ExportReportInput } from "@/features/report/report.types";
import { ExportSheet } from "@/features/report/ui/ExportSheet";
import { ServiceContextLine } from "@/features/service/ui/ServiceContextLine";
import { ServiceFiguresRow } from "@/features/service/ui/ServiceFiguresRow";
import { ServiceHistoryTable } from "@/features/service/ui/ServiceHistoryTable";
import { useServicePageParams } from "@/features/service/useServicePageParams";
import { DUE_FROM } from "@/features/service_tracking/attentionLevel";
import { useGarageTrackedActions } from "@/features/service_tracking/tracking.queries";
import { AllGoodCard } from "@/features/service_tracking/ui/AllGoodCard";
import { JobsPanel } from "@/features/service_tracking/ui/JobsPanel";
import { PlannedCard } from "@/features/service_tracking/ui/PlannedCard";
import { homePeriodServices } from "@/features/stats/homePeriod";
import { HomePeriodSwitcher } from "@/features/stats/ui/HomePeriodSwitcher";
import { ADD_SERVICE } from "@/layout/navItems";
import { useHeaderStore } from "@/store/store";
import { EmptyService } from "./EmptyService";

export function ServiceDesktop(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setActionSlot = useHeaderStore((state) => state.setActionSlot);
  const params = useServicePageParams();
  const { data: bikes } = useBikes();
  const { data: due } = useGarageTrackedActions(DUE_FROM);
  // What the Export button is exporting. Null keeps the export sheet shut.
  const [exporting, setExporting] = useState<ExportReportInput | null>(null);

  // A bike the garage does not have - typed by hand, or since archived - reads as every bike.
  const bikeId = bikes === undefined || bikes.some((bike) => bike.id === params.bikeId) ? params.bikeId : null;
  const hasBikes = (bikes?.length ?? 0) > 0;
  const period = homePeriodServices(params.period);
  // A Period Report covers one bike; a garage of one needs no choice to say which.
  const exportBikeId = bikeId ?? (bikes?.length === 1 ? bikes[0].id : null);
  const addServicePath = bikeId === null ? ADD_SERVICE.path : `${ADD_SERVICE.path}?bike=${String(bikeId)}`;
  const anythingDue = (due ?? []).some((action) => bikeId === null || action.bike_id === bikeId);

  // Export and Add service hang in the header beside the title - see the header store.
  useEffect(() => {
    if (!hasBikes) return;
    setActionSlot(
      <Group gap="sm" wrap="nowrap">
        <Tooltip label={t("service.exportPickBike")} disabled={exportBikeId !== null}>
          {/* A disabled button fires no hover, so the tooltip hangs on its wrapper. */}
          <Box component="span">
            <Button
              variant="outline"
              radius="md"
              disabled={exportBikeId === null}
              leftSection={<Download size={16} color="var(--mantine-color-primary-5)" />}
              onClick={() => {
                if (exportBikeId === null) return;
                setExporting({ kind: "PERIOD", bike_id: exportBikeId, from: period.from ?? undefined });
              }}
            >
              {t("service.export")}
            </Button>
          </Box>
        </Tooltip>
        <Button
          color="primary.6"
          c="textDark.6"
          radius="md"
          leftSection={<Plus size={16} />}
          onClick={() => navigate(addServicePath)}
        >
          {t(ADD_SERVICE.labelKey)}
        </Button>
      </Group>,
    );
    return () => setActionSlot(null);
  }, [setActionSlot, t, navigate, hasBikes, exportBikeId, period.from, addServicePath]);

  if (bikes === undefined) {
    return (
      <Group justify="center" p="xl">
        <Loader size="sm" />
      </Group>
    );
  }
  if (!hasBikes) return <EmptyService />;

  return (
    // No top padding: the context line belongs to the header's title just above it.
    <Stack gap="md" p="xl" pt={0}>
      <ServiceContextLine bikeId={bikeId} />
      <Group justify="space-between" wrap="nowrap" align="center">
        {/* One bike is not a choice worth offering. */}
        <Group gap={8} wrap="wrap">
          {bikes.length > 1 && (
            <>
              <BikeFilterChip
                label={t("service.allBikes")}
                active={bikeId === null}
                onClick={() => params.setBike(null)}
              />
              {bikes.map((bike) => (
                <BikeFilterChip
                  key={bike.id}
                  label={bikeTitle(bike)}
                  colorIndex={bike.color_index}
                  active={bikeId === bike.id}
                  onClick={() => params.setBike(bike.id)}
                />
              ))}
            </>
          )}
        </Group>
        <HomePeriodSwitcher value={params.period} onChange={params.setPeriod} />
      </Group>

      <ServiceFiguresRow bikeId={bikeId} period={params.period} />
      <PlannedCard bikeId={bikeId} />
      {due !== undefined && !anythingDue ? <AllGoodCard /> : <JobsPanel bikeId={bikeId} />}
      <ServiceHistoryTable
        bikeId={bikeId}
        period={period}
        page={params.page}
        onPage={params.setPage}
        onAdd={() => navigate(addServicePath)}
      />

      <ExportSheet input={exporting} onClose={() => setExporting(null)} />
    </Stack>
  );
}
