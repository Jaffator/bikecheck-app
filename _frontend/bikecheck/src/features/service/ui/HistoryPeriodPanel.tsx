// The phone history's Period: the shared panel, plus All, since this page has no switcher to leave a Period with.
import type { ReactElement } from "react";
import { Button } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ALL_TIME, closedSpan } from "@/features/service/servicePeriod";
import type { ServicePeriod } from "@/features/service/service.types";
import { homePeriodServices } from "@/features/stats/homePeriod";
import { PeriodPanel } from "@/features/stats/ui/PeriodPanel";

interface HistoryPeriodPanelProps {
  opened: boolean;
  onClose: () => void;
  period: ServicePeriod;
  onChange: (period: ServicePeriod) => void;
}

export function HistoryPeriodPanel({ opened, onClose, period, onChange }: HistoryPeriodPanelProps): ReactElement {
  const { t } = useTranslation();

  return (
    <PeriodPanel
      opened={opened}
      onClose={onClose}
      value={closedSpan(period)}
      onChange={(next) => onChange(homePeriodServices(next))}
      action={
        <Button
          fullWidth
          radius="md"
          variant="outline"
          onClick={() => {
            onChange(ALL_TIME);
            onClose();
          }}
        >
          {t("stats.periodAll")}
        </Button>
      }
    >
      {/* Phone only, so there is nothing for a popover to hang under. */}
      {null}
    </PeriodPanel>
  );
}
