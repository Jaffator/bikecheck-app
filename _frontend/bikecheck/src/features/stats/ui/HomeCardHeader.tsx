// What opens each of Home's Period cards: its title, the Period, and the total in large figures.
import type { ReactElement, ReactNode } from "react";
import { Group, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { homePeriodLabel } from "../homePeriod";
import type { HomePeriod } from "../stats.types";

export const HOME_FIGURE_SIZE = 28;
const FIGURE_LINE = 1.1;

export function HomeCardHeader({ title, period }: { title: string; period: HomePeriod }): ReactElement {
  const { t, i18n } = useTranslation();
  const label = homePeriodLabel(period, i18n.language, t);

  return (
    <Group justify="space-between" align="baseline" wrap="nowrap" gap="sm">
      <Text fz={17} fw={600} c="text.6">
        {title}
      </Text>
      {/* Capitalised because it stands alone, though Czech writes months small. */}
      <Text fz={13} c="text.7" style={{ flexShrink: 0 }}>
        {label.charAt(0).toUpperCase() + label.slice(1)}
      </Text>
    </Group>
  );
}

export function HomeFigure({ children }: { children: ReactNode }): ReactElement {
  return (
    <Text
      className="tabular-nums"
      fz={HOME_FIGURE_SIZE}
      fw={600}
      lh={FIGURE_LINE}
      lts="var(--tracking-display)"
      c="text.6"
      style={{ flexShrink: 0 }}
    >
      {children}
    </Text>
  );
}
