// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { type ReactElement } from "react";
import {
  Box,
  Button,
  FileButton,
  Group,
  Image,
  Paper,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Camera, Gauge, ImagePlus, Shapes, Tag, Zap } from "lucide-react";
import type { BikeSearchResult } from "../bikes/bikes.types";
import { inputStyles, dropdownProps } from "./formStyles";
import { useScrollIntoViewOnFocus } from "@/hooks/useScrollIntoViewOnFocus";
import { usePinPageScroll } from "@/hooks/usePinPageScroll";
import { FRAME_SIZES, WHEEL_SIZES } from "./bikeSpecification.types";
import type { BikeSpecificationValues, FrameSize, SuspensionLayout } from "./bikeSpecification.types";

interface BikeSpecificationProps {
  // Selected lookup result, if available.
  bike: BikeSearchResult | null;
  fallbackName: string;
  year: string | null;
  categories: string[];
  values: BikeSpecificationValues;
  onChange: <K extends keyof BikeSpecificationValues>(field: K, value: BikeSpecificationValues[K]) => void;
  // Locally selected photo overrides the scraped image.
  photoUrl: string | null;
  onPickPhoto: (file: File | null) => void;
}

function FieldLabel({ children, dimmed = false }: { children: string; dimmed?: boolean }): ReactElement {
  return (
    <Text size="xs" fw={600} c={dimmed ? "text.9" : "text.7"} tt="uppercase" style={{ letterSpacing: "0.05em" }}>
      {children}
    </Text>
  );
}

// Use wrapping buttons because wheel-size options exceed one mobile row.
function ChoiceButton({
  label,
  selected,
  onSelect,
  // Shrinks for rows that have to fit more options across the screen.
  basis = "4rem",
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  basis?: string;
}): ReactElement {
  return (
    <Button
      variant="default"
      radius="sm"
      onClick={() => {
        onSelect();
      }}
      styles={{
        root: {
          flex: `1 1 ${basis}`,
          // Long labels ("Mullet", "Other") must not force the row wider.
          minWidth: 0,
          padding: "0 0.5rem",
          height: "2.75rem",
          backgroundColor: selected
            ? "color-mix(in srgb, var(--mantine-color-primary-6) 15%, transparent)"
            : "var(--mantine-color-cards-6)",
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
  photoUrl,
  onPickPhoto,
}: BikeSpecificationProps): ReactElement {
  const { t } = useTranslation();
  const displayName = bike?.name ?? fallbackName;
  // Prefer local photo over scraped image.
  const shownPhoto = photoUrl ?? bike?.imageUrl ?? null;
  console.log(shownPhoto);
  const suspensionOptions: { value: SuspensionLayout; label: string }[] = [
    { value: "hardtail", label: t("addBike.suspensionHardtail") },
    { value: "full", label: t("addBike.suspensionFull") },
    { value: "none", label: t("addBike.suspensionNone") },
  ];

  // Request frame length only for custom size.
  const acceptsSizeLength = values.frameSize === "other";

  // Clear custom length when switching to letter size.
  function selectFrameSize(size: FrameSize): void {
    onChange("frameSize", size);
    if (size !== "other" && values.sizeLength !== "") {
      onChange("sizeLength", "");
    }
  }

  // Keep focused fields above the fixed footer and keyboard.
  const formRef = useScrollIntoViewOnFocus<HTMLDivElement>("[data-fixed-footer]");
  const pinPageScroll = usePinPageScroll();

  return (
    <Stack gap="lg" ref={formRef}>
      <Paper bg="cards.6" radius="md" style={{ border: "1px solid var(--mantine-color-other-borderSubtle)" }}>
        {shownPhoto ? (
          <Image src={shownPhoto} alt={displayName} h={180} fit="contain" bg="white" p="sm" radius="md" />
        ) : (
          // Make an empty photo slot the mobile upload target.
          <FileButton onChange={onPickPhoto} accept="image/*">
            {(props) => (
              <UnstyledButton
                {...props}
                onClick={() => {
                  props.onClick();
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  width: "100%",
                  height: 180,
                  borderBottom: "1px solid var(--mantine-color-other-borderSubtle)",
                }}
              >
                <ImagePlus size={28} color="var(--mantine-color-primary-6)" />
                <Text size="sm" c="text.7">
                  {t("addBike.addPhoto")}
                </Text>
              </UnstyledButton>
            )}
          </FileButton>
        )}
        <Group justify="space-between" wrap="nowrap" p="md">
          <Stack gap={0}>
            <Text fw={700} size="lg" c="text.6">
              {displayName}
            </Text>
            {year && (
              <Text size="sm" c="text.8">
                {year}
              </Text>
            )}
          </Stack>
          {/* Allow replacing scraped photos. */}
          {shownPhoto && (
            <FileButton onChange={onPickPhoto} accept="image/*">
              {(props) => (
                <Button
                  {...props}
                  onClick={() => {
                    props.onClick();
                  }}
                  variant="subtle"
                  color="primary.6"
                  size="compact-sm"
                  radius="sm"
                  leftSection={<Camera size={16} />}
                >
                  {t("addBike.changePhoto")}
                </Button>
              )}
            </FileButton>
          )}
        </Group>
      </Paper>

      <Stack gap={4}>
        <FieldLabel>{t("addBike.bikeName")}</FieldLabel>
        <TextInput
          placeholder={t("addBike.bikeNamePlaceholder")}
          leftSection={<Tag size={18} />}
          value={values.bikeName}
          onChange={(event) => onChange("bikeName", event.currentTarget.value)}
          radius="sm"
          styles={inputStyles}
        />
      </Stack>

      <Stack gap={4}>
        <FieldLabel>{t("addBike.currentMileage")}</FieldLabel>
        <TextInput
          placeholder={t("addBike.currentMileagePlaceholder")}
          leftSection={<Gauge size={18} />}
          // Use numeric keyboard for total mileage.
          inputMode="numeric"
          value={values.currentMileage}
          onChange={(event) => onChange("currentMileage", event.currentTarget.value.replace(/\D/g, ""))}
          rightSection={
            <Text size="sm" c="text.8">
              km
            </Text>
          }
          radius="sm"
          styles={inputStyles}
        />
      </Stack>

      <Stack gap={4}>
        <FieldLabel>{t("addBike.category")}</FieldLabel>
        <Select
          // Opening the dropdown must not move the page under the finger.
          onPointerDown={pinPageScroll}
          placeholder={t("addBike.categoryPlaceholder")}
          leftSection={<Shapes size={18} />}
          data={categories}
          value={values.category}
          onChange={(value) => onChange("category", value)}
          radius="sm"
          styles={{
            input: {
              backgroundColor: "var(--mantine-color-cards-6)",
              border: "none",
              color: "var(--mantine-color-text-6)",
              height: "3rem",
            },
          }}
          comboboxProps={dropdownProps}
        />
      </Stack>

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

      <Stack gap={4}>
        <FieldLabel>{t("addBike.frameSize")}</FieldLabel>
        <Group gap={6} grow wrap="nowrap">
          {FRAME_SIZES.map((size) => (
            <ChoiceButton
              key={size}
              basis="2.5rem"
              label={size === "other" ? t("addBike.frameSizeOther") : size}
              selected={values.frameSize === size}
              onSelect={() => selectFrameSize(size)}
            />
          ))}
        </Group>
      </Stack>

      {/* Show custom length only for other frame size. */}
      {acceptsSizeLength && (
        <Stack gap={4}>
          <FieldLabel>{t("addBike.sizeLength")}</FieldLabel>
          <TextInput
            placeholder={t("addBike.sizeLengthPlaceholder")}
            value={values.sizeLength}
            onChange={(event) => onChange("sizeLength", event.currentTarget.value)}
            radius="sm"
            styles={{ input: inputStyles.input }}
          />
        </Stack>
      )}

      <Stack gap={4}>
        <FieldLabel>{t("addBike.wheelSize")}</FieldLabel>
        {/* Keep wheel sizes in a stable three-column grid. */}
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "0.625rem",
          }}
        >
          {WHEEL_SIZES.map((size) => (
            <ChoiceButton
              key={size}
              label={size}
              selected={values.wheelSize === size}
              onSelect={() => onChange("wheelSize", size)}
            />
          ))}
        </Box>
      </Stack>

      <Stack gap={4}>
        <FieldLabel>{t("addBike.power")}</FieldLabel>
        <Paper
          bg="cards.6"
          p="md"
          radius="sm"
          style={{
            border: "1px solid var(--mantine-color-other-borderSubtle)",
          }}
        >
          <Group justify="space-between" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
              <Zap size={18} color="var(--mantine-color-primary-6)" />
              <Text size="md" c="text.6">
                {t("addBike.ebike")}
              </Text>
            </Group>
            <Switch
              withThumbIndicator={false}
              checked={values.ebike}
              onChange={(event) => {
                onChange("ebike", event.currentTarget.checked);
              }}
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
        </Paper>
      </Stack>
    </Stack>
  );
}
