// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { type ReactElement } from "react";
import { Button, Group, Image, Paper, Select, Stack, Switch, Text, TextInput } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Shapes, Zap } from "lucide-react";
import { tapFeedback } from "@/utils/haptics";
import type { BikeSearchResult } from "../bikes/bikes.types";
import { inputStyles, dropdownProps } from "./formStyles";

// Suspension is stored as two independent booleans on the bike, but the user
// picks one of three mutually exclusive layouts.
export type SuspensionLayout = "hardtail" | "full" | "none";

const FRAME_SIZES = ["S", "M", "L", "XL", "other"] as const;
export type FrameSize = (typeof FRAME_SIZES)[number];

const WHEEL_SIZES = ['26"', '27.5"', '29"', "700C", "650B", "Mullet"] as const;
export type WheelSize = (typeof WHEEL_SIZES)[number];

export interface BikeSpecificationValues {
  category: string | null;
  suspension: SuspensionLayout | null;
  frameSize: FrameSize | null;
  // Free text — a number for road frames, empty when the user picked a letter.
  sizeLength: string;
  wheelSize: WheelSize | null;
  ebike: boolean;
}

interface BikeSpecificationProps {
  // The pick from step 1, or null when the user chose to enter the bike by
  // hand — then the name they typed heads the step instead of a scraped card.
  bike: BikeSearchResult | null;
  fallbackName: string;
  year: string | null;
  categories: string[];
  values: BikeSpecificationValues;
  onChange: <K extends keyof BikeSpecificationValues>(field: K, value: BikeSpecificationValues[K]) => void;
}

function FieldLabel({ children }: { children: string }): ReactElement {
  return (
    <Text size="xs" fw={600} c="text.7" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
      {children}
    </Text>
  );
}

// Mantine's SegmentedControl keeps every option on one row, which does not fit
// six wheel sizes on a phone — a wrapping row of buttons does.
function ChoiceButton({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}): ReactElement {
  return (
    <Button
      variant="default"
      radius="sm"
      onClick={() => {
        tapFeedback();
        onSelect();
      }}
      styles={{
        root: {
          flex: "1 1 4rem",
          height: "2.75rem",
          backgroundColor: "var(--mantine-color-inputs-6)",
          border: selected
            ? "1px solid var(--mantine-color-primary-6)"
            : "1px solid var(--mantine-color-other-borderSubtle)",
          color: selected ? "var(--mantine-color-primary-6)" : "var(--mantine-color-text-6)",
        },
      }}
    >
      {label}
    </Button>
  );
}

export function BikeSpecification({
  bike,
  fallbackName,
  year,
  categories,
  values,
  onChange,
}: BikeSpecificationProps): ReactElement {
  const { t } = useTranslation();
  const displayName = bike?.name ?? fallbackName;

  const suspensionOptions: { value: SuspensionLayout; label: string }[] = [
    { value: "hardtail", label: t("addBike.suspensionHardtail") },
    { value: "full", label: t("addBike.suspensionFull") },
    { value: "none", label: t("addBike.suspensionNone") },
  ];

  return (
    <Stack gap="lg">
      {/* ----------- Picked bike ----------- */}
      <Paper bg="cards.6" radius="md" style={{ border: "1px solid var(--mantine-color-other-borderSubtle)" }}>
        {bike?.imageUrl && (
          <Image src={bike.imageUrl} alt={displayName} h={180} fit="contain" bg="white" p="sm" radius="md" />
        )}
        <Stack gap={0} p="md">
          <Text fw={700} size="lg" c="text.6">
            {displayName}
          </Text>
          {year && (
            <Text size="sm" c="text.8">
              {year}
            </Text>
          )}
        </Stack>
      </Paper>

      {/* ----------- Category ----------- */}
      <Stack gap={4}>
        <FieldLabel>{t("addBike.category")}</FieldLabel>
        <Select
          placeholder={t("addBike.categoryPlaceholder")}
          leftSection={<Shapes size={18} />}
          data={categories}
          value={values.category}
          onChange={(value) => onChange("category", value)}
          radius="sm"
          styles={inputStyles}
          comboboxProps={dropdownProps}
        />
      </Stack>

      {/* ----------- Suspension ----------- */}
      <Stack gap={4}>
        <FieldLabel>{t("addBike.suspension")}</FieldLabel>
        <Group gap="xs" grow wrap="nowrap">
          {suspensionOptions.map((option) => (
            <ChoiceButton
              key={option.value}
              label={option.label}
              selected={values.suspension === option.value}
              onSelect={() => onChange("suspension", option.value)}
            />
          ))}
        </Group>
      </Stack>

      {/* ----------- Frame size ----------- */}
      <Stack gap={4}>
        <FieldLabel>{t("addBike.frameSize")}</FieldLabel>
        <Group gap="xs" grow wrap="nowrap">
          {FRAME_SIZES.map((size) => (
            <ChoiceButton
              key={size}
              label={size === "other" ? t("addBike.frameSizeOther") : size}
              selected={values.frameSize === size}
              onSelect={() => onChange("frameSize", size)}
            />
          ))}
        </Group>
      </Stack>

      {/* ----------- Size / length ----------- */}
      <Stack gap={4}>
        <FieldLabel>{t("addBike.sizeLength")}</FieldLabel>
        <TextInput
          placeholder={t("addBike.sizeLengthPlaceholder")}
          value={values.sizeLength}
          onChange={(event) => onChange("sizeLength", event.currentTarget.value)}
          radius="sm"
          styles={inputStyles}
        />
      </Stack>

      {/* ----------- Wheel size ----------- */}
      <Stack gap={4}>
        <FieldLabel>{t("addBike.wheelSize")}</FieldLabel>
        <Group gap="xs">
          {WHEEL_SIZES.map((size) => (
            <ChoiceButton
              key={size}
              label={size}
              selected={values.wheelSize === size}
              onSelect={() => onChange("wheelSize", size)}
            />
          ))}
        </Group>
      </Stack>

      {/* ----------- Power ----------- */}
      <Stack gap={4}>
        <FieldLabel>{t("addBike.power")}</FieldLabel>
        <Paper
          bg="cards.6"
          p="md"
          radius="sm"
          style={{ border: "1px solid var(--mantine-color-other-borderSubtle)" }}
        >
          <Group justify="space-between" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
              <Zap size={18} color="var(--mantine-color-primary-6)" />
              <Text size="md" c="text.6">
                {t("addBike.ebike")}
              </Text>
            </Group>
            <Switch
              checked={values.ebike}
              onChange={(event) => {
                tapFeedback();
                onChange("ebike", event.currentTarget.checked);
              }}
              aria-label={t("addBike.ebike")}
              color="primary.6"
            />
          </Group>
        </Paper>
      </Stack>
    </Stack>
  );
}
