// PROTOTYPE (proto/desktop-wizards): step 2 on desktop - the same fields in two columns; the photo moved to the side panel.
import { type ReactElement } from "react";
import { Box, Button, Group, Paper, Select, Stack, Switch, Text, TextInput } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { FieldLabel } from "../BikeSpecification";
import { FRAME_SIZES, WHEEL_SIZES, type FrameSize, type SuspensionLayout } from "../bikeSpecification.types";
import { dropdownProps, inputStyles } from "../formStyles";
import type { AddBikeWizard } from "../useAddBikeWizard";
import { cardSurface } from "./bikeProto";

const SUSPENSIONS: { value: SuspensionLayout; labelKey: string }[] = [
  { value: "hardtail", labelKey: "addBike.suspensionHardtail" },
  { value: "full", labelKey: "addBike.suspensionFull" },
  { value: "none", labelKey: "addBike.suspensionNone" },
];

function Choice({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }): ReactElement {
  return (
    <Button
      variant="default"
      radius="md"
      aria-pressed={selected}
      onClick={onSelect}
      styles={{
        root: {
          height: "2.4rem",
          minWidth: "3.5rem",
          padding: "0 1rem",
          backgroundColor: selected
            ? "color-mix(in srgb, var(--mantine-color-primary-6) 15%, transparent)"
            : "var(--mantine-color-cards-7)",
          border: selected ? "1px solid var(--mantine-color-primary-7)" : "1px solid var(--mantine-color-inputs-5)",
          color: selected ? "var(--mantine-color-primary-6)" : "var(--mantine-color-text-6)",
        },
      }}
    >
      {label}
    </Button>
  );
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: ReactElement }): ReactElement {
  return (
    <Stack gap={6} style={wide ? { gridColumn: "1 / -1" } : undefined}>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </Stack>
  );
}

export function BikeSpecDesktop({ wizard }: { wizard: AddBikeWizard }): ReactElement {
  const { t } = useTranslation();
  const values = wizard.specification;
  const change = wizard.changeSpecification;

  // A letter size carries no length of its own.
  function selectFrameSize(size: FrameSize): void {
    change("frameSize", size);
    if (size !== "other" && values.sizeLength !== "") change("sizeLength", "");
  }

  return (
    <Paper radius="lg" p="lg" style={cardSurface}>
      <Box style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(15rem, 1fr))", gap: "1.4rem 1.5rem" }}>
        <Field label={t("addBike.bikeName")}>
          <TextInput
            placeholder={t("addBike.bikeNamePlaceholder")}
            value={values.bikeName}
            onChange={(event) => change("bikeName", event.currentTarget.value)}
            styles={inputStyles}
          />
        </Field>

        <Field label={t("addBike.currentMileage")}>
          <TextInput
            placeholder={t("addBike.currentMileagePlaceholder")}
            inputMode="numeric"
            className="tabular-nums"
            value={values.currentMileage}
            onChange={(event) => change("currentMileage", event.currentTarget.value.replace(/\D/g, ""))}
            rightSection={
              <Text size="sm" c="text.8">
                km
              </Text>
            }
            styles={inputStyles}
          />
        </Field>

        <Field label={t("addBike.category")}>
          <Select
            placeholder={t("addBike.categoryPlaceholder")}
            data={wizard.categories}
            value={values.category}
            onChange={(value) => change("category", value)}
            styles={inputStyles}
            comboboxProps={dropdownProps}
          />
        </Field>

        <Field label={t("addBike.power")}>
          <Group
            justify="space-between"
            wrap="nowrap"
            px={12}
            style={{ ...inputStyles.input, display: "flex", alignItems: "center" }}
          >
            <Text fz={14} fw={600} c="text.6">
              {t("addBike.ebike")}
            </Text>
            <Switch
              withThumbIndicator={false}
              checked={values.ebike}
              onChange={(event) => change("ebike", event.currentTarget.checked)}
              aria-label={t("addBike.ebike")}
              styles={{
                track: {
                  backgroundColor: values.ebike ? "var(--mantine-color-primary-6)" : "var(--mantine-color-cards-4)",
                  borderColor: "var(--mantine-color-other-borderSolid)",
                },
                thumb: {
                  backgroundColor: values.ebike ? "var(--mantine-color-black)" : "var(--mantine-color-text-6)",
                },
              }}
            />
          </Group>
        </Field>

        <Field label={t("addBike.suspension")}>
          <Group gap={8}>
            {SUSPENSIONS.map((option) => (
              <Choice
                key={option.value}
                label={t(option.labelKey)}
                selected={values.suspension === option.value}
                onSelect={() => change("suspension", option.value)}
              />
            ))}
          </Group>
        </Field>

        <Field label={t("addBike.frameSize")}>
          <Group gap={8}>
            {FRAME_SIZES.map((size) => (
              <Choice
                key={size}
                label={size === "other" ? t("addBike.frameSizeOther") : size}
                selected={values.frameSize === size}
                onSelect={() => selectFrameSize(size)}
              />
            ))}
            {/* Asked for only beside the choice that needs it. */}
            {values.frameSize === "other" && (
              <TextInput
                aria-label={t("addBike.sizeLength")}
                placeholder={t("addBike.sizeLengthPlaceholder")}
                value={values.sizeLength}
                onChange={(event) => change("sizeLength", event.currentTarget.value)}
                w={120}
                styles={{ input: inputStyles.input }}
              />
            )}
          </Group>
        </Field>

        <Field label={t("addBike.wheelSize")} wide>
          <Group gap={8}>
            {WHEEL_SIZES.map((size) => (
              <Choice
                key={size}
                label={size}
                selected={values.wheelSize === size}
                onSelect={() => change("wheelSize", size)}
              />
            ))}
          </Group>
        </Field>
      </Box>
    </Paper>
  );
}
