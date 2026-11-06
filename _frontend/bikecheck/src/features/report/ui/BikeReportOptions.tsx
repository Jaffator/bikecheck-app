// Step one of a Bike Report: what goes in. A card on the phone's sheet; on desktop the modal
// is the surface, so the options sit straight on it.
import { useState, type CSSProperties, type ReactElement } from "react";
import { Button, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { ShareSwitchRow } from "@/features/profile/ui/ShareSwitchRow";
import { HistoryPeriodPanel } from "@/features/service/ui/HistoryPeriodPanel";
import { ALL_TIME, periodLabel } from "@/features/service/servicePeriod";
import type { ServicePeriod } from "@/features/service/service.types";
import { useIsDesktop } from "@/layout/breakpoints";

const CARD_ON_SHEET: CSSProperties = {
  padding: "12px 16px",
  backgroundColor: "var(--color-surface-raised)",
  border: "1px solid var(--color-border-raised)",
  borderRadius: "var(--mantine-radius-lg)",
};

// What the owner keeps in. Frozen into the Report the moment it is made.
export interface BikeReportChoice {
  components: boolean;
  history: boolean;
  period: ServicePeriod;
}

interface BikeReportOptionsProps {
  initial: BikeReportChoice;
  onPreview: (choice: BikeReportChoice) => void;
}

export function BikeReportOptions({ initial, onPreview }: BikeReportOptionsProps): ReactElement {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const [components, setComponents] = useState(initial.components);
  const [history, setHistory] = useState(initial.history);
  const [period, setPeriod] = useState(initial.period);
  const [pickingPeriod, setPickingPeriod] = useState(false);

  return (
    <Stack gap={0} pb="md" style={isDesktop ? undefined : CARD_ON_SHEET}>
      {!isDesktop && (
        <Text className="tabular-nums uppercase" fz={11} c="var(--color-text-dim)" lts="var(--tracking-label)">
          {t("report.titleBike")}
        </Text>
      )}
      <ShareSwitchRow
        first
        label={t("report.optionComponents")}
        checked={components}
        disabled={false}
        onChange={setComponents}
      />
      <ShareSwitchRow label={t("report.optionHistory")} checked={history} disabled={false} onChange={setHistory} />
      {/* A span means nothing to a document without the history it would narrow. */}
      {history && (
        <HistoryPeriodPanel
          opened={pickingPeriod}
          onClose={() => setPickingPeriod(false)}
          period={period}
          onChange={setPeriod}
        >
          <PeriodRow period={period} onClick={() => setPickingPeriod(true)} />
        </HistoryPeriodPanel>
      )}
      <Button
        fullWidth
        mt={6}
        h={44}
        color="primary.6"
        c="textDark.6"
        radius="md"
        onClick={() => onPreview({ components, history, period })}
      >
        {t("report.preview")}
      </Button>
    </Stack>
  );
}

function PeriodRow({ period, onClick }: { period: ServicePeriod; onClick: () => void }): ReactElement {
  const { t, i18n } = useTranslation();
  const whole = period.from === ALL_TIME.from && period.to === ALL_TIME.to;

  return (
    <UnstyledButton
      w="100%"
      py={10}
      onClick={onClick}
      style={{ borderTop: "1px solid var(--color-border-subtle)" }}
    >
      <Group justify="space-between" wrap="nowrap" gap="sm">
        <Text fw={600} fz={15} c="text.6">
          {t("report.optionPeriod")}
        </Text>
        <Group gap={6} wrap="nowrap">
          <Text className="tabular-nums" fz={14} c="var(--color-text-dim)">
            {whole ? t("report.coversAll") : periodLabel(period, t, i18n.language)}
          </Text>
          <ChevronDown size={16} color="var(--color-text-dim)" />
        </Group>
      </Group>
    </UnstyledButton>
  );
}
