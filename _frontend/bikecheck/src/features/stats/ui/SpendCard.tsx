// Home's spend card; what goes into each slice is decided in StatsService.
import type { ReactElement, ReactNode } from "react";
import {
  Box,
  Center,
  Group,
  Paper,
  Skeleton,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Eyebrow } from "@/components/Eyebrow";
import { colorIndexOf } from "@/features/bikes/bikeColors";
import { useBikes } from "@/features/bikes/bikes.queries";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import type { ListedBike } from "@/features/bikes/bikes.types";
import { BikeColorDot } from "@/features/bikes/ui/BikeColorDot";
import { periodSearch } from "@/features/service/servicePeriod";
import { useIsDesktop } from "@/layout/breakpoints";
import { formatCost } from "@/utils/money";
import { DEFAULT_HOME_PERIOD, homePeriodLabel } from "../homePeriod";
import { categoryLabel } from "../spendCategories";
import { useSpend } from "../stats.queries";
import type { HomePeriod, Spend, SpendBike, SpendCategory } from "../stats.types";

const FIGURE_SIZE = 28;
const FIGURE_LINE = 1.1;
const CATEGORY_BAR_HEIGHT = 4;
const NAME_LINE_HEIGHT = 20;
// Pads a one-line bike row to 40px, its tap height.
const ROW_PADDING = 10;
const TRACK_COLOR = "var(--color-border-subtle)";
// Neutral, so colour always means a bike and length always means money.
const CATEGORY_COLOR = "var(--mantine-color-cards-1)";

export function SpendCard({ period }: { period: HomePeriod }): ReactElement {
  const { t } = useTranslation();
  const { data: spend } = useSpend(period);
  // Spend never lists an Archived Bike, so the garage holds every bike it names.
  const { data: bikes } = useBikes();

  if (spend === undefined) {
    return (
      <SpendPaper>
        <Skeleton h={14} w="60%" />
        <Skeleton h={FIGURE_SIZE} w="35%" />
        <Skeleton h={NAME_LINE_HEIGHT} />
      </SpendPaper>
    );
  }

  return (
    <SpendPaper>
      <Stack gap={10}>
        <SpendHeader period={period} />
        {spend.bikes.length > 0 && <SpendTotal spend={spend} />}
      </Stack>

      {spend.bikes.length === 0 ? (
        <Text fz={13} c="var(--color-text-dim)">
          {t("stats.spendEmpty")}
        </Text>
      ) : (
        <>
          <BikeRows spend={spend} period={period} bikes={bikes} />
          <CategoryBars spend={spend} />
        </>
      )}
    </SpendPaper>
  );
}

function SpendHeader({ period }: { period: HomePeriod }): ReactElement {
  const { t, i18n } = useTranslation();
  const label = homePeriodLabel(period, i18n.language, t);

  return (
    <Group justify="space-between" align="baseline" wrap="nowrap" gap="sm">
      <Text fz={17} fw={600} c="text.6">
        {t("stats.spend")}
      </Text>
      {/* Capitalised because it stands alone, though Czech writes months small. */}
      <Text fz={13} c="text.7" style={{ flexShrink: 0 }}>
        {label.charAt(0).toUpperCase() + label.slice(1)}
      </Text>
    </Group>
  );
}

function SpendTotal({ spend }: { spend: Spend }): ReactElement {
  const { i18n } = useTranslation();

  return (
    <Text
      className="tabular-nums"
      fz={FIGURE_SIZE}
      fw={600}
      lh={FIGURE_LINE}
      lts="var(--tracking-display)"
      c="text.6"
    >
      {formatCost(spend.total, spend.currency, i18n.language)}
    </Text>
  );
}

// Highest spend first, as StatsService orders them.
function BikeRows({
  spend,
  period,
  bikes,
}: {
  spend: Spend;
  period: HomePeriod;
  bikes: ListedBike[] | undefined;
}): ReactElement {
  const { t } = useTranslation();

  // Pulled a little off the total, so the eyebrow reads with the rows under it.
  return (
    <Box pt={4}>
      <Eyebrow>{t("stats.byBike")}</Eyebrow>
      {spend.bikes.map((bike) => (
        <BikeRow
          key={bike.bike_id}
          spend={spend}
          period={period}
          bike={bike}
          colorIndex={colorIndexOf(bikes, bike.bike_id)}
        />
      ))}
    </Box>
  );
}

function BikeRow({
  spend,
  period,
  bike,
  colorIndex,
}: {
  spend: Spend;
  period: HomePeriod;
  bike: SpendBike;
  colorIndex: number | null;
}): ReactElement {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const history = historyLink(bike.bike_id, spend, period, isDesktop);

  return (
    <UnstyledButton
      onClick={() => navigate(history)}
      className="hover-veil active:scale-[0.985]"
      style={{
        display: "block",
        width: "100%",
        transition: "transform 0.12s ease",
      }}
    >
      <Group justify="space-between" wrap="nowrap" gap="sm" py={ROW_PADDING} align="flex-start">
        <Group gap={8} wrap="nowrap" align="flex-start" style={{ minWidth: 0 }}>
          {/* Sits on the name's first line, so a wrapped name keeps its dot beside it. */}
          <Center h={NAME_LINE_HEIGHT} style={{ flexShrink: 0 }}>
            <BikeColorDot colorIndex={colorIndex} size={7} />
          </Center>
          <Text fz={14} fw={500} lh={`${String(NAME_LINE_HEIGHT)}px`} c="text.6">
            {bikeTitle(bike)}
            <Text
              span
              className="tabular-nums"
              fz={12}
              fw={400}
              c="text.8"
              ml={8}
              style={{ whiteSpace: "nowrap" }}
            >
              {t("dashboard.servicesCount", { count: bike.service_count })}
            </Text>
          </Text>
        </Group>
        <Text
          className="tabular-nums"
          fz={14}
          lh={`${String(NAME_LINE_HEIGHT)}px`}
          c="text.6"
          style={{ flexShrink: 0 }}
        >
          {formatCost(bike.total, spend.currency, i18n.language)}
        </Text>
      </Group>
    </UnstyledButton>
  );
}

// Desktop's history is /service; the phone keeps the bike's own page, over the window spend counted.
function historyLink(bikeId: number, spend: Spend, period: HomePeriod, isDesktop: boolean): string {
  if (!isDesktop) return `/bikes/${String(bikeId)}/history${periodSearch(spend)}`;
  const query = new URLSearchParams({ bike: String(bikeId) });
  if (period !== DEFAULT_HOME_PERIOD) query.set("period", period);
  return `/service?${query.toString()}`;
}

// The Component Categories, grey and scaled against the largest, under the bikes.
function CategoryBars({ spend }: { spend: Spend }): ReactElement {
  const { t } = useTranslation();
  const largest = Math.max(
    ...spend.categories.map((category) => category.amount),
  );

  return (
    <Stack
      gap={12}
      pt={14}
      style={{ borderTop: "1px solid var(--color-border-subtle)" }}
    >
      <Eyebrow>{t("stats.byGroup")}</Eyebrow>
      {spend.categories.map((category) => (
        <CategoryBar
          key={category.key}
          spend={spend}
          category={category}
          largest={largest}
        />
      ))}
    </Stack>
  );
}

function CategoryBar({
  spend,
  category,
  largest,
}: {
  spend: Spend;
  category: SpendCategory;
  largest: number;
}): ReactElement {
  const { t, i18n } = useTranslation();

  return (
    <Box>
      <Group justify="space-between" wrap="nowrap" gap="sm" mb={7}>
        <Text fz={14} fw={500} c="text.6" lineClamp={1}>
          {categoryLabel(category, t)}
        </Text>
        <Text
          className="tabular-nums"
          fz={14}
          c="text.6"
          style={{ flexShrink: 0 }}
        >
          {formatCost(category.amount, spend.currency, i18n.language)}
        </Text>
      </Group>
      <Meter
        height={CATEGORY_BAR_HEIGHT}
        share={category.amount / largest}
        color={CATEGORY_COLOR}
      />
    </Box>
  );
}

// A filled share of a sunk track, so a short bar still reads against the full length.
function Meter({
  height,
  share,
  color,
}: {
  height: number;
  share: number;
  color: string;
}): ReactElement {
  return (
    <Box
      h={height}
      style={{
        borderRadius: height / 2,
        backgroundColor: TRACK_COLOR,
        overflow: "hidden",
      }}
    >
      <Box
        h="100%"
        w={`${String(share * 100)}%`}
        style={{ borderRadius: height / 2, backgroundColor: color }}
      />
    </Box>
  );
}

function SpendPaper({ children }: { children: ReactNode }): ReactElement {
  return (
    <Paper
      radius="lg"
      p="md"
      style={{
        overflow: "hidden",
        backgroundColor: "var(--mantine-color-cards-6)",
        backgroundImage: "var(--card-glow)",
        border: "none",
        boxShadow: "var(--elev-panel)",
      }}
    >
      <Stack gap={14}>{children}</Stack>
    </Paper>
  );
}
