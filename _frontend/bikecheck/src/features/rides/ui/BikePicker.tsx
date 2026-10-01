// Picks the bike a ride goes on, or none of the rider's. Picking only reports it: the caller
// writes it when the ride is saved, unlike ChangeBikeMenu, which moves the ride on pick.
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { Box, Combobox, Group, Stack, Text, UnstyledButton, useCombobox } from "@mantine/core";
import { Ban, Check, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Eyebrow } from "@/components/Eyebrow";
import { bikeTitle, bikeTypeAndYear } from "@/features/bikes/bikeTitle";
import type { ListedBike } from "@/features/bikes/bikes.types";
import { BikeColorDot } from "@/features/bikes/ui/BikeColorDot";
import type { BikePick } from "@/features/rides/checkInSave";
import { useIsDesktop } from "@/layout/breakpoints";

// The accent marks only "Změnit" and the picked bike's check.
const ACCENT = "var(--mantine-color-primary-6)";
const NOT_MINE_INK = "var(--mantine-color-text-7)";
// The option's value; a bike's is its id, so it can never clash.
const NOT_MINE = "not-mine";

// A finger needs the taller row; a pointer gets the denser list.
const ROW_HEIGHT = { phone: 48, desktop: 36 };
// A long garage scrolls inside the list, so it never runs past the sheet; the half row hints at it.
const VISIBLE_ROWS = 5.5;

interface BikePickerProps {
  bikes: ListedBike[];
  // Null while the garage loads, or for a bike no longer in it; `fallbackName` stands in.
  picked: ListedBike | null;
  // The rider picked none of their bikes; `picked` is then null.
  notMine: boolean;
  fallbackName: string;
  onPick: (pick: BikePick) => void;
  // Held by the caller, which dims what the open list covers.
  opened: boolean;
  onOpenedChange: (opened: boolean) => void;
}

export function BikePicker({
  bikes,
  picked,
  notMine,
  fallbackName,
  onPick,
  opened,
  onOpenedChange,
}: BikePickerProps): ReactElement {
  const isDesktop = useIsDesktop();
  const rowHeight = isDesktop ? ROW_HEIGHT.desktop : ROW_HEIGHT.phone;
  const combobox = useCombobox({
    opened,
    onOpenedChange,
    onDropdownOpen: () => combobox.updateSelectedOptionIndex("active"),
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  function submit(value: string): void {
    onPick(value === NOT_MINE ? { kind: "notMine" } : { kind: "bike", bikeId: Number(value) });
    combobox.closeDropdown();
  }

  return (
    // In place, not portalled: a portalled dropdown flickers in the Capacitor webview.
    <Combobox
      store={combobox}
      onOptionSubmit={submit}
      withinPortal={false}
      position="bottom"
      offset={6}
      width="target"
      radius={12}
      dropdownPadding={0}
      styles={{ dropdown: { overflow: "hidden" } }}
    >
      <Combobox.Target targetType="button">
        <UnstyledButton
          onClick={() => combobox.toggleDropdown()}
          style={{
            ...TRIGGER_STYLE,
            borderColor: opened ? "var(--color-border-solid)" : "var(--mantine-color-inputs-5)",
          }}
        >
          <TriggerContent opened={opened} notMine={notMine} picked={picked} fallbackName={fallbackName} />
        </UnstyledButton>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options mah={rowHeight * VISIBLE_ROWS} style={{ overflowY: "auto" }}>
          {bikes.map((bike, index) => (
            <BikeOption
              key={bike.id}
              bike={bike}
              active={bike.id === picked?.id}
              separated={index > 0}
              rowHeight={rowHeight}
            />
          ))}
          <NotMineOption active={notMine} rowHeight={rowHeight} withHint={isDesktop} />
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
  minHeight: 56,
  padding: "8px 14px",
  borderRadius: 12,
  border: "1px solid",
  backgroundColor: "var(--mantine-color-cards-7)",
};

interface TriggerContentProps {
  opened: boolean;
  notMine: boolean;
  picked: ListedBike | null;
  fallbackName: string;
}

function TriggerContent({ opened, notMine, picked, fallbackName }: TriggerContentProps): ReactElement {
  const { t } = useTranslation();
  if (opened) return <ChooseBikeLabel />;
  if (notMine) {
    return (
      <PickedRow
        mark={<NotMineMark />}
        name={t("checkIn.notMyBike")}
        meta={t("checkIn.noBikeRide")}
      />
    );
  }

  return (
    <PickedRow
      mark={<BikeColorDot colorIndex={picked?.color_index ?? null} size={10} />}
      name={picked === null ? fallbackName : nameWithoutYear(picked)}
      meta={picked === null ? "" : bikeTypeAndYear(picked)}
    />
  );
}

function PickedRow({ mark, name, meta }: { mark: ReactNode; name: string; meta: string }): ReactElement {
  const { t } = useTranslation();

  return (
    <>
      {mark}
      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
        <Text fz={16} fw={600} c="text.6" lineClamp={1}>
          {name}
        </Text>
        {meta !== "" && <Eyebrow>{meta}</Eyebrow>}
      </Stack>
      <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
        <Text fz={13} fw={600} c="primary.6">
          {t("checkIn.change")}
        </Text>
        <ChevronDown size={14} strokeWidth={2.4} color={ACCENT} />
      </Group>
    </>
  );
}

function ChooseBikeLabel(): ReactElement {
  const { t } = useTranslation();
  return (
    <>
      <Text fz={15} fw={600} c="text.7" style={{ flex: 1 }}>
        {t("checkIn.chooseBike")}
      </Text>
      <ChevronUp size={16} strokeWidth={2.4} color="var(--mantine-color-text-7)" style={{ flexShrink: 0 }} />
    </>
  );
}

interface BikeOptionProps {
  bike: ListedBike;
  active: boolean;
  separated: boolean;
  rowHeight: number;
}

function BikeOption({ bike, active, separated, rowHeight }: BikeOptionProps): ReactElement {
  const meta = bikeTypeAndYear(bike);

  return (
    <Combobox.Option
      value={String(bike.id)}
      active={active}
      style={{
        ...OPTION_STYLE,
        minHeight: rowHeight,
        borderTop: separated ? "1px solid var(--color-border-subtle)" : undefined,
      }}
    >
      <BikeColorDot colorIndex={bike.color_index} size={10} />
      <Text fz={14} fw={600} c="text.6" lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
        {nameWithoutYear(bike)}
      </Text>
      {meta !== "" && (
        <Box style={{ flexShrink: 0 }}>
          <Eyebrow>{meta}</Eyebrow>
        </Box>
      )}
      {active && <Check size={16} strokeWidth={2.8} color={ACCENT} style={{ flexShrink: 0 }} />}
    </Combobox.Option>
  );
}

interface NotMineOptionProps {
  active: boolean;
  rowHeight: number;
  // Desktop has the room to say what kind of bike that was.
  withHint: boolean;
}

// Under a firmer line than the bikes': it is not one of them.
function NotMineOption({ active, rowHeight, withHint }: NotMineOptionProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Combobox.Option
      value={NOT_MINE}
      active={active}
      style={{ ...OPTION_STYLE, minHeight: rowHeight, borderTop: "1px solid var(--color-border-strong)" }}
    >
      <NotMineMark />
      <Text fz={14} fw={600} c="text.7" lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
        {t("checkIn.notMyBike")}
        {withHint && (
          <Text span inherit fw={400} c="var(--color-text-dim)">
            {` · ${t("checkIn.notMyBikeHint")}`}
          </Text>
        )}
      </Text>
      {active && <Check size={16} strokeWidth={2.8} color={ACCENT} style={{ flexShrink: 0 }} />}
    </Combobox.Option>
  );
}

function NotMineMark(): ReactElement {
  return <Ban size={16} strokeWidth={2} color={NOT_MINE_INK} style={{ flexShrink: 0 }} />;
}

const OPTION_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "0 14px",
  borderRadius: 0,
};

// The type · year line sits under or beside the name, so the name leaves the year out.
function nameWithoutYear(bike: ListedBike): string {
  return bikeTitle({ ...bike, year: null });
}
