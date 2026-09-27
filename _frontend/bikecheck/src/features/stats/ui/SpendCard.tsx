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
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { formatCost } from "@/utils/money";
import { categoryColor, categoryLabel } from "../spendCategories";
import { useSpend } from "../stats.queries";
import type { Spend, SpendBike } from "../stats.types";

const BAR_HEIGHT = 8;

export function SpendCard(): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: spend } = useSpend();

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
              <BikeBar key={bike.bike_id} spend={spend} bike={bike} />
            ))}
          </Stack>
          <Legend spend={spend} />
        </>
      )}
    </SpendPaper>
  );
}

// Scaled against the bike that spent most, so the lengths compare directly.
function BikeBar({
  spend,
  bike,
}: {
  spend: Spend;
  bike: SpendBike;
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
        <Text fz={13} c="text.7" lineClamp={1}>
          {bikeTitle(bike)}
        </Text>
        <Text
          className="font-mono"
          fz={13}
          c="text.7"
          style={{ flexShrink: 0 }}
        >
          {formatCost(bike.total, spend.currency, i18n.language)}
        </Text>
      </Group>
      <Box
        h={BAR_HEIGHT}
        w={`${String((bike.total / largest) * 100)}%`}
        style={{
          display: "flex",
          borderRadius: BAR_HEIGHT / 2,
          overflow: "hidden",
        }}
      >
        {bike.segments.map((segment, index) =>
          segment.amount > 0 ? (
            <Box
              key={segment.key}
              h="100%"
              style={{
                flex: `${String(segment.amount)} 1 0`,
                backgroundColor: categoryColor(spend.categories[index], index),
              }}
            />
          ) : null,
        )}
      </Box>
    </UnstyledButton>
  );
}

function Legend({ spend }: { spend: Spend }): ReactElement {
  const { t, i18n } = useTranslation();
  const share = new Intl.NumberFormat(i18n.language, {
    style: "percent",
    maximumFractionDigits: 0,
  });

  return (
    <Group gap="sm" style={{ rowGap: 4 }}>
      {spend.categories.map((category, index) => (
        <Group key={category.key} gap={6} wrap="nowrap">
          <Box
            w={8}
            h={8}
            style={{
              borderRadius: "50%",
              backgroundColor: categoryColor(category, index),
              flexShrink: 0,
            }}
          />
          <Text fz={13} c="text.7">
            {categoryLabel(category, t)}
          </Text>
          <Text className="font-mono" fz={13} c="var(--color-text-dim)">
            {share.format(category.amount / spend.total)}
          </Text>
        </Group>
      ))}
    </Group>
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
