// The bike's category as one grouped-list row, picked from a sheet - mock L.
// A plain list rather than a Select: a portalled dropdown makes the sheet flicker in Capacitor.
import { useState, type CSSProperties, type ReactElement } from "react";
import { Stack, Text, UnstyledButton } from "@mantine/core";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ListRow } from "@/components/GroupedList";
import { LIST_ROW_HEIGHT } from "@/components/groupedListStyles";
import { PANEL_HAIRLINE } from "@/components/panelRows";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";

const SHEET_STYLES = {
  content: { height: "auto", maxHeight: "88dvh" },
  // The desktop modal's; a bottom sheet takes the wrapper's.
  body: { paddingBottom: "1rem" },
  title: { fontWeight: 600, color: "var(--mantine-color-text-6)" },
};

function optionStyle(first: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    width: "100%",
    minHeight: LIST_ROW_HEIGHT,
    borderTop: first ? undefined : PANEL_HAIRLINE,
  };
}

interface BikeCategoryRowProps {
  categories: string[];
  value: string | null;
  onChange: (category: string) => void;
}

export function BikeCategoryRow({ categories, value, onChange }: BikeCategoryRowProps): ReactElement {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);

  // One tap is the whole choice, so the sheet closes on it.
  function pick(category: string): void {
    onChange(category);
    setOpened(false);
  }

  return (
    <>
      <ListRow label={t("addBike.category")} onClick={() => setOpened(true)}>
        <Text fz={14} c={value === null ? "text.8" : "text.6"} truncate>
          {value ?? t("addBike.categoryPlaceholder")}
        </Text>
      </ListRow>
      <ResponsiveSheet
        opened={opened}
        onClose={() => setOpened(false)}
        desktop="modal"
        title={t("addBike.category")}
        styles={SHEET_STYLES}
      >
        <Stack gap={0}>
          {categories.map((category, index) => (
            <CategoryOption
              key={category}
              label={category}
              selected={category === value}
              first={index === 0}
              onPick={() => pick(category)}
            />
          ))}
        </Stack>
      </ResponsiveSheet>
    </>
  );
}

interface CategoryOptionProps {
  label: string;
  selected: boolean;
  first: boolean;
  onPick: () => void;
}

function CategoryOption({ label, selected, first, onPick }: CategoryOptionProps): ReactElement {
  return (
    <UnstyledButton aria-pressed={selected} onClick={onPick} style={optionStyle(first)}>
      <Text component="span" fz={14} fw={selected ? 600 : 400} c={selected ? "primary.6" : "text.6"}>
        {label}
      </Text>
      {selected && <Check size={18} color="var(--mantine-color-primary-6)" style={{ flexShrink: 0 }} />}
    </UnstyledButton>
  );
}
