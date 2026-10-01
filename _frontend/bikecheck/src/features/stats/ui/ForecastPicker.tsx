// Picks the part the forecast draws, among one bike's; the list opens over the chart, so the card keeps its height.
import type { CSSProperties, ReactElement } from "react";
import { Combobox, Stack, Text, UnstyledButton, useCombobox } from "@mantine/core";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatServiceDateShort } from "@/features/service/serviceDates";
import { catalogueLabel } from "@/features/service/serviceLabels";
import { trackedActionKey, trackedPartLabel } from "@/features/service_tracking/attentionLevel";
import { WearArc } from "@/features/service_tracking/ui/WearArc";
import type { WearForecastItem } from "../stats.types";
import { forecastFigure, forecastNote } from "../wearForecast";

const ACCENT = "var(--mantine-color-primary-6)";
const ROW_HEIGHT = 52;
// Fits over the header, chart and legend below the field, so the card never clips it; the half row hints at more.
const VISIBLE_ROWS = 4.5;

interface ForecastPickerProps {
  options: WearForecastItem[];
  selected: WearForecastItem;
  onPick: (key: string) => void;
}

export function ForecastPicker({ options, selected, onPick }: ForecastPickerProps): ReactElement {
  const { t } = useTranslation();
  const combobox = useCombobox({
    onDropdownOpen: () => combobox.updateSelectedOptionIndex("active"),
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const selectedKey = trackedActionKey(selected);
  const position = options.findIndex((item) => trackedActionKey(item) === selectedKey) + 1;

  function submit(key: string): void {
    onPick(key);
    combobox.closeDropdown();
  }

  return (
    // In place, not portalled: a portalled dropdown flickers in the Capacitor webview. Never flipped
    // above the field, where the card would clip it.
    <Combobox
      store={combobox}
      onOptionSubmit={submit}
      withinPortal={false}
      position="bottom"
      middlewares={{ flip: false, shift: false }}
      offset={6}
      width="target"
      radius={14}
      dropdownPadding={0}
      styles={{ dropdown: { overflow: "hidden" } }}
    >
      <Combobox.Target targetType="button">
        <UnstyledButton
          onClick={() => combobox.toggleDropdown()}
          aria-label={t("stats.forecastPickPart")}
          style={triggerStyle(combobox.dropdownOpened)}
        >
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Text fz={15} fw={600} c="text.6" lineClamp={1}>
              {trackedPartLabel(selected, t)}
            </Text>
            <Text fz={12} c="var(--color-text-dim)" lineClamp={1}>
              {catalogueLabel(selected.action_i18n_key, selected.action_name, t)}
            </Text>
          </Stack>
          <Text className="tabular-nums" fz={11} c="var(--color-text-dim)" style={{ flexShrink: 0 }}>
            {`${String(position)} / ${String(options.length)}`}
          </Text>
          <ChevronDown
            size={16}
            strokeWidth={2.4}
            color={ACCENT}
            style={{ flexShrink: 0, transform: combobox.dropdownOpened ? "rotate(180deg)" : undefined }}
          />
        </UnstyledButton>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options mah={ROW_HEIGHT * VISIBLE_ROWS} style={{ overflowY: "auto" }}>
          {options.map((item, index) => (
            <ForecastOption
              key={trackedActionKey(item)}
              item={item}
              active={trackedActionKey(item) === selectedKey}
              separated={index > 0}
            />
          ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

const TRIGGER_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  width: "100%",
  height: 56,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid var(--mantine-color-inputs-5)",
  backgroundColor: "var(--mantine-color-cards-7)",
};

function triggerStyle(opened: boolean): CSSProperties {
  return opened ? { ...TRIGGER_STYLE, borderColor: ACCENT } : TRIGGER_STYLE;
}

interface ForecastOptionProps {
  item: WearForecastItem;
  active: boolean;
  separated: boolean;
}

// The bike is left out: the chip above already says it.
function ForecastOption({ item, active, separated }: ForecastOptionProps): ReactElement {
  const { t, i18n } = useTranslation();
  const figure = forecastFigure(item, t, (date) => formatServiceDateShort(date, i18n.language));

  return (
    <Combobox.Option
      value={trackedActionKey(item)}
      active={active}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        minHeight: ROW_HEIGHT,
        padding: "0 12px",
        borderRadius: 0,
        borderTop: separated ? "1px solid var(--color-border-subtle)" : undefined,
        backgroundColor: active ? `color-mix(in srgb, ${ACCENT} 10%, transparent)` : undefined,
      }}
    >
      <WearArc percentage={item.percentage} />
      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
        <Text fz={14} fw={600} c="text.6" lineClamp={1}>
          {trackedPartLabel(item, t)}
        </Text>
        <Text fz={12} c="var(--color-text-dim)" lineClamp={1}>
          {catalogueLabel(item.action_i18n_key, item.action_name, t)}
        </Text>
      </Stack>
      <Stack gap={2} align="flex-end" style={{ flexShrink: 0 }}>
        <Text className="tabular-nums" fz={13} fw={600} lts="var(--tracking-label)" c="text.6">
          {figure}
        </Text>
        <Text className="tabular-nums" fz={11} c="var(--color-text-dim)">
          {forecastNote(item, t, { brief: true })}
        </Text>
      </Stack>
    </Combobox.Option>
  );
}
