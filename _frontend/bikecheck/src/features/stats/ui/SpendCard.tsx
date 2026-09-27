// Home's spend card; what goes into each slice is decided in StatsService.
import type { ReactElement, ReactNode } from "react";
import {
  Box,
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
import { bikeColor, colorIndexOf } from "@/features/bikes/bikeColors";
import { useBikes } from "@/features/bikes/bikes.queries";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { BikeColorDot } from "@/features/bikes/ui/BikeColorDot";
import { formatCost } from "@/utils/money";
import { categoryLabel } from "../spendCategories";
import { useSpend } from "../stats.queries";
import type { Spend, SpendBike, SpendCategory } from "../stats.types";

const BAR_HEIGHT = 8;
const CATEGORY_BAR_HEIGHT = 6;
const TRACK_COLOR = "var(--color-border-subtle)";
// Neutral, so colour always means a bike and length always means money.
const CATEGORY_COLOR = "var(--mantine-color-cards-4)";

export function SpendCard(): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: spend } = useSpend();
  // Spend never lists an Archived Bike, so the garage holds every bike it names.
  const { data: bikes } = useBikes();

  if (spend === undefined) {
    return (
      <SpendPaper>
        <Skeleton h={14} w="60%" />
        <Skeleton h={BAR_HEIGHT} />
      </SpendPaper>
    );
  }

  return (
    <SpendPaper>
      <Group justify="space-between" wrap="nowrap" gap="sm">
        <Text fz={16} fw={600} c="text.6">
          {t("stats.spendTitle", { year: spend.year })}
        </Text>
        <Text
          className="font-mono"
          fz={16}
          fw={600}
          c="text.6"
          style={{ flexShrink: 0 }}
        >
          {formatCost(spend.total, spend.currency, i18n.language)}
        </Text>
      </Group>

      {spend.bikes.length === 0 ? (
        <Text fz={13} c="var(--color-text-dim)">
          {t("stats.spendEmpty")}
        </Text>
      ) : (
        <>
          <Stack gap="sm">
            {spend.bikes.map((bike) => (
              <BikeBar
                key={bike.bike_id}
                spend={spend}
                bike={bike}
                colorIndex={colorIndexOf(bikes, bike.bike_id)}
              />
            ))}
          </Stack>
          <CategoryBars spend={spend} />
        </>
      )}
    </SpendPaper>
  );
}

// Scaled against the bike that spent most, so the lengths compare directly.
function BikeBar({
  spend,
  bike,
  colorIndex,
}: {
  spend: Spend;
  bike: SpendBike;
  colorIndex: number | null;
}): ReactElement {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const largest = spend.bikes[0].total;
  const history = `/bikes/${String(bike.bike_id)}/history?from=${String(spend.year)}-01-01&to=${String(spend.year)}-12-31`;

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
      <Group justify="space-between" wrap="nowrap" gap="sm" mb={6}>
        <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
          <BikeColorDot colorIndex={colorIndex} />
          <Text fz={13} c="text.7" lineClamp={1}>
            {bikeTitle(bike)}
          </Text>
        </Group>
        <Text
          className="font-mono"
          fz={13}
          c="text.7"
          style={{ flexShrink: 0 }}
        >
          {formatCost(bike.total, spend.currency, i18n.language)}
        </Text>
      </Group>
      <Meter
        height={BAR_HEIGHT}
        share={bike.total / largest}
        color={colorIndex === null ? CATEGORY_COLOR : bikeColor(colorIndex)}
      />
    </UnstyledButton>
  );
}

// The Component Categories, grey and scaled against the largest, under the bikes.
function CategoryBars({ spend }: { spend: Spend }): ReactElement {
  const { t } = useTranslation();
  const largest = Math.max(
    ...spend.categories.map((category) => category.amount),
  );

  return (
    <Stack
      gap={6}
      pt="sm"
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
      <Group justify="space-between" wrap="nowrap" gap="sm" mb={4}>
        <Text fz={13} c="text.7" lineClamp={1}>
          {categoryLabel(category, t)}
        </Text>
        <Text
          className="font-mono"
          fz={13}
          c="text.7"
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
      // Fills a desktop grid cell, so cards side by side end level.
      h="100%"
      style={{
        overflow: "hidden",
        backgroundColor: "var(--mantine-color-cards-6)",
        backgroundImage: "var(--card-glow)",
        border: "none",
        boxShadow: "var(--elev-panel)",
      }}
    >
      <Stack gap="md">{children}</Stack>
    </Paper>
  );
}
