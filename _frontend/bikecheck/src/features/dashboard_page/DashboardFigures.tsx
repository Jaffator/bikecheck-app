// Desktop Home's row of figures: what is due, distance, this year's spend, Strava's two counts.
import { useState, type ReactElement } from "react";
import { Box, SimpleGrid, Skeleton, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { Eyebrow } from "@/components/Eyebrow";
import { PRESS_TRANSITION } from "@/components/panelRows";
import { useBikes } from "@/features/bikes/bikes.queries";
import { useHistoryTotals } from "@/features/service/service.queries";
import { DUE_FROM, attentionColor } from "@/features/service_tracking/attentionLevel";
import { useGarageTrackedActions } from "@/features/service_tracking/tracking.queries";
import { usePendingRides, useConnectStrava } from "@/features/strava/strava.queries";
import { GearLinkingSheet } from "@/features/strava/ui/GearLinkingSheet";
import { useCurrentUser } from "@/features/users/users.queries";
import { formatCost } from "@/utils/money";
import StravaMark from "@/assets/icons/svg_icons/strava.svg?react";

export function DashboardFigures(): ReactElement {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const { data: bikes } = useBikes();
  const { data: due } = useGarageTrackedActions(DUE_FROM);
  const { data: pending } = usePendingRides();
  const connect = useConnectStrava();
  const [pairing, setPairing] = useState(false);
  const year = dayjs().year();
  const { data: totals } = useHistoryTotals(undefined, { from: `${String(year)}-01-01`, to: null });

  const number = (value: number): string => new Intl.NumberFormat(i18n.language).format(Math.round(value));
  const km = (bikes ?? []).reduce((sum, bike) => sum + (bike.total_km ?? 0), 0);
  const hours = (bikes ?? []).reduce((sum, bike) => sum + (bike.total_time_min ?? 0), 0) / 60;
  const climb = (bikes ?? []).reduce((sum, bike) => sum + (bike.total_elevation_m ?? 0), 0);
  const overdue = (due ?? []).filter((action) => action.level === "overdue").length;
  const connected = Boolean(user?.strava_athlete_id);
  const unpaired = (bikes ?? []).filter((bike) => bike.strava_gear_id === null).length;

  return (
    <>
      <SimpleGrid cols={{ base: 3, lg: 5 }} spacing="md">
        <Figure
          title={t("dashboard.dueTitle")}
          value={due === undefined ? null : number(due.length)}
          detail={overdue > 0 ? t("dashboard.overdueCount", { value: overdue }) : t("dashboard.noneOverdue")}
          detailMono={overdue > 0}
          detailColor={overdue > 0 ? attentionColor(100) : undefined}
          onOpen={() => navigate("/service")}
        />
        <Figure
          title={t("dashboard.distanceTitle")}
          value={bikes === undefined ? null : `${number(km)} km`}
          detail={`${number(hours)} h · ${number(climb)} m`}
          detailMono
          onOpen={() => navigate("/bikes")}
        />
        <Figure
          title={t("dashboard.spendTitle", { year })}
          value={totals === undefined ? null : formatCost(totals.total_cost, user?.currency ?? null, i18n.language)}
          detail={totals === undefined ? "" : t("dashboard.servicesCount", { count: totals.service_count })}
          detailMono
          onOpen={() => navigate(`/service/history?from=${String(year)}-01-01`)}
        />
        <Figure
          title={t("pendingRides.title")}
          value={connected ? number(pending?.length ?? 0) : "—"}
          detail={`${t("strava.statusTitle")} · ${connected ? t("strava.statusConnectedShort") : t("dashboard.notConnected")}`}
          onOpen={() => navigate("/rides?tab=pending")}
        />
        <Figure
          strava
          title={t("dashboard.unpairedTitle")}
          value={!connected ? "—" : bikes === undefined ? null : number(unpaired)}
          detail={
            !connected
              ? `${t("strava.statusTitle")} · ${t("dashboard.notConnected")}`
              : unpaired > 0
                ? `${t("strava.unpairedBikesAction")} ›`
                : t("dashboard.allPaired")
          }
          // Unconnected, pairing has nothing to pair with yet - connecting is the step.
          onOpen={() => (connected ? setPairing(true) : connect.mutate())}
        />
      </SimpleGrid>

      <GearLinkingSheet opened={pairing} onClose={() => setPairing(false)} />
    </>
  );
}

interface FigureProps {
  title: string;
  // Null while it loads.
  value: string | null;
  detail: string;
  // Numbers read in mono, words in the body font.
  detailMono?: boolean;
  detailColor?: string;
  // A Strava figure is a colour block, drawn the way BikeStravaCard is.
  strava?: boolean;
  onOpen: () => void;
}

function Figure({
  title,
  value,
  detail,
  detailMono = false,
  detailColor,
  strava = false,
  onOpen,
}: FigureProps): ReactElement {
  // Dark ink on the orange block; the card's own tones everywhere else.
  const ink = strava ? "var(--mantine-color-textDark-6)" : undefined;

  return (
    <UnstyledButton
      onClick={onOpen}
      className="hover-veil active:scale-[0.985]"
      p="md"
      style={{
        borderRadius: "var(--mantine-radius-lg)",
        backgroundColor: strava ? "var(--mantine-color-strava-6)" : "var(--mantine-color-cards-6)",
        // A flat colour block takes no glow - see docs/ui/card-surface.md.
        backgroundImage: strava ? undefined : "var(--card-glow)",
        border: "none",
        boxShadow: "var(--elev-panel)",
        position: "relative",
        overflow: "hidden",
        transition: PRESS_TRANSITION,
      }}
    >
      {strava && (
        <Box
          aria-hidden
          style={{
            position: "absolute",
            top: "50%",
            right: -32,
            transform: "translateY(-50%) rotate(-12deg)",
            color: "var(--mantine-color-textDark-6)",
            opacity: 0.12,
            pointerEvents: "none",
          }}
        >
          <StravaMark width={112} height={112} />
        </Box>
      )}
      <Stack gap={4} style={{ position: "relative" }}>
        <Eyebrow color={ink}>{title}</Eyebrow>
        {value === null ? (
          <Skeleton h={20} w="50%" radius="sm" />
        ) : (
          <Text className="font-mono" fz={16} fw={600} c={ink ?? "text.6"} lineClamp={1}>
            {value}
          </Text>
        )}
        <Text
          className={detailMono ? "font-mono" : undefined}
          fz={13}
          c={ink ?? detailColor ?? "var(--color-text-dim)"}
          lineClamp={1}
        >
          {detail}
        </Text>
      </Stack>
    </UnstyledButton>
  );
}
