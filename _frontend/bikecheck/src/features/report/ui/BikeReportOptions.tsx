// Step one of a Bike Report: what goes in, as rows the owner taps on and off. Frozen into the
// Report the moment it is made.
import { useState, type ReactElement, type ReactNode } from "react";
import { Box, Button, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Cog, Eye, History } from "lucide-react";
import { HistoryPeriodPanel } from "@/features/service/ui/HistoryPeriodPanel";
import { ALL_TIME, periodLabel } from "@/features/service/servicePeriod";
import type { ServicePeriod } from "@/features/service/service.types";

// What the owner keeps in.
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
  const [components, setComponents] = useState(initial.components);
  const [history, setHistory] = useState(initial.history);
  const [period, setPeriod] = useState(initial.period);
  const [pickingPeriod, setPickingPeriod] = useState(false);
  // A report with nothing in it says nothing, so there is nothing to preview.
  const empty = !components && !history;

  return (
    <Stack gap="sm" pb="md">
      <Text fz={14} c="var(--color-text-dim)">
        {t("report.optionsTitle")}
      </Text>
      <OptionRow
        icon={<Cog size={20} />}
        label={t("report.optionComponents")}
        hint={t("report.optionComponentsHint")}
        on={components}
        onToggle={() => setComponents(!components)}
      />
      <OptionRow
        icon={<History size={20} />}
        label={t("report.optionHistory")}
        hint={t("report.optionHistoryHint")}
        on={history}
        onToggle={() => setHistory(!history)}
      />
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
        h={52}
        color="primary.6"
        c="textDark.6"
        radius="md"
        disabled={empty}
        leftSection={<Eye size={20} />}
        onClick={() => onPreview({ components, history, period })}
      >
        {t("report.preview")}
      </Button>
    </Stack>
  );
}

interface OptionRowProps {
  icon: ReactNode;
  label: string;
  hint: string;
  on: boolean;
  onToggle: () => void;
}

function OptionRow({ icon, label, hint, on, onToggle }: OptionRowProps): ReactElement {
  return (
    <UnstyledButton
      aria-pressed={on}
      onClick={onToggle}
      w="100%"
      mih={64}
      px={14}
      py={12}
      style={{
        borderRadius: "var(--mantine-radius-lg)",
        border: `1px solid ${on ? "color-mix(in srgb, var(--mantine-color-primary-6) 45%, transparent)" : "var(--color-border-subtle)"}`,
        backgroundColor: on ? "color-mix(in srgb, var(--mantine-color-primary-6) 6%, transparent)" : "transparent",
        transition: "background-color 160ms ease, border-color 160ms ease",
      }}
    >
      <Group gap={14} wrap="nowrap">
        <Box
          style={{
            width: 36,
            height: 36,
            flexShrink: 0,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "var(--color-border-subtle)",
            color: "var(--mantine-color-text-5)",
          }}
        >
          {icon}
        </Box>
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Text fz={16} fw={500} c="text.6">
            {label}
          </Text>
          <Text fz={13} c="var(--color-text-dim)">
            {hint}
          </Text>
        </Stack>
        <CheckMark on={on} />
      </Group>
    </UnstyledButton>
  );
}

// The round tick on the right: filled and ticked when the row is in the report.
function CheckMark({ on }: { on: boolean }): ReactElement {
  return (
    <Box
      style={{
        width: 22,
        height: 22,
        flexShrink: 0,
        borderRadius: 11,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: on ? "var(--mantine-color-primary-6)" : "transparent",
        border: on ? "none" : "1.5px solid var(--color-border)",
        color: "var(--mantine-color-black)",
      }}
    >
      {on && <Check size={14} strokeWidth={3} />}
    </Box>
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
