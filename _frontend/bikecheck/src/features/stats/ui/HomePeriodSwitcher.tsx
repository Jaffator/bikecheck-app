// Home's Period: this month, the current year by its number, or all time.
import type { ReactElement } from "react";
import { SegmentedControl } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { homePeriodLabel, parseHomePeriod } from "../homePeriod";
import type { HomePeriod } from "../stats.types";

// The phone's pill track: as wide as the figures under it, one segment each. The height is the
// label's line: a height set on the track itself squeezes the indicator off centre.
const PILL_LABEL_LINE = 26;

interface HomePeriodSwitcherProps {
  value: HomePeriod;
  onChange: (period: HomePeriod) => void;
  // The phone runs it across the page as a pill bound to the figures; desktop hangs it in the header.
  fullWidth?: boolean;
}

export function HomePeriodSwitcher({ value, onChange, fullWidth = false }: HomePeriodSwitcherProps): ReactElement {
  const { t, i18n } = useTranslation();

  return (
    <SegmentedControl
      value={value}
      onChange={(next) => onChange(parseHomePeriod(next))}
      fullWidth={fullWidth}
      radius={fullWidth ? "xl" : "lg"}
      withItemsBorders={false}
      // Darker than the theme's dim, so the bright chosen Period stands out.
      classNames={{
        label:
          "!text-[var(--mantine-color-text-8)] data-[active]:!text-[var(--mantine-color-text-6)] data-[active]:font-bold",
      }}
      styles={
        fullWidth
          ? {
              root: { border: "1px solid var(--color-border-subtle)" },
              indicator: { boxShadow: "0 1px 2px rgba(0, 0, 0, 0.4)" },
              label: { lineHeight: `${String(PILL_LABEL_LINE)}px` },
            }
          : undefined
      }
      aria-label={t("stats.period")}
      data={[
        { value: "month", label: t("stats.periodMonth") },
        { value: "year", label: homePeriodLabel("year", i18n.language, t) },
        { value: "all", label: t(fullWidth ? "stats.periodAllLong" : "stats.periodAll") },
      ]}
    />
  );
}
