// Desktop Home's Period: this month, the current year by its number, or all time.
import type { ReactElement } from "react";
import { SegmentedControl } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { homePeriodLabel, parseHomePeriod } from "../homePeriod";
import type { HomePeriod } from "../stats.types";

interface HomePeriodSwitcherProps {
  value: HomePeriod;
  onChange: (period: HomePeriod) => void;
}

export function HomePeriodSwitcher({ value, onChange }: HomePeriodSwitcherProps): ReactElement {
  const { t, i18n } = useTranslation();

  return (
    <SegmentedControl
      value={value}
      onChange={(next) => onChange(parseHomePeriod(next))}
      radius="md"
      withItemsBorders={false}
      // The theme dims every label; the chosen Period reads bright.
      classNames={{ label: "data-[active]:!text-[var(--mantine-color-text-6)] data-[active]:font-bold" }}
      aria-label={t("stats.period")}
      data={[
        { value: "month", label: t("stats.periodMonth") },
        { value: "year", label: homePeriodLabel("year", i18n.language, t) },
        { value: "all", label: t("stats.periodAll") },
      ]}
    />
  );
}
