// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useId, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { Box, FileButton, Group, Image, SegmentedControl, Stack, Switch, Text, TextInput, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Camera, ImagePlus } from "lucide-react";
import type { BikeSearchResult } from "@/features/bikes/bikes.types";
import { BikeCategoryRow } from "@/features/bikes/ui/BikeCategoryRow";
import { GroupedList, ListRow } from "@/components/GroupedList";
import { LIST_ROW_HEIGHT, listRowFigureInputStyles, listRowInputStyles } from "@/components/groupedListStyles";
import { PANEL_HAIRLINE } from "@/components/panelRows";
import { useScrollIntoViewOnFocus } from "@/hooks/useScrollIntoViewOnFocus";
import { FRAME_SIZES, WHEEL_SIZES } from "./bikeSpecification.types";
import type { BikeSpecificationValues, FrameSize, SuspensionLayout } from "./bikeSpecification.types";

const HERO_HEIGHT = 180;

const EMPTY_HERO_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.5rem",
  width: "100%",
  height: HERO_HEIGHT,
  borderBottom: PANEL_HAIRLINE,
};

const CHANGE_PHOTO_STYLE: CSSProperties = {
  position: "absolute",
  right: 10,
  bottom: 10,
  display: "flex",
  alignItems: "center",
  gap: 6,
  height: 32,
  padding: "0 12px",
  borderRadius: 8,
  backgroundColor: "color-mix(in srgb, var(--mantine-color-background-9) 78%, transparent)",
  color: "var(--mantine-color-text-6)",
  fontSize: 13,
  fontWeight: 500,
};

// An empty field that must be filled says so in its own placeholder.
const INVALID_INPUT_STYLES = {
  ...listRowInputStyles,
  input: { ...listRowInputStyles.input, "--input-placeholder-color": "var(--mantine-color-red-5)" } as CSSProperties,
};

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
  // What the mileage field is called. The wizard asks for the odometer as it stands; the
  // edit form shows the same number later, when rides have moved on, and must say so.
  mileageLabel?: string;
  // Rows under the photo, before the name; an array so each gets its hairline. The wizard has
  // none - the lookup settled the identity - and names the bike there instead.
  identity?: ReactElement[];
}

export function FieldLabel({ children, dimmed = false }: { children: string; dimmed?: boolean }): ReactElement {
  return (
    <Text size="xs" fw={600} c={dimmed ? "text.9" : "text.7"} tt="uppercase" lts="var(--tracking-label)">
      {children}
    </Text>
  );
}

interface TextRowProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  // A figure on the numeric keyboard, with its unit beside the field.
  numeric?: boolean;
  suffix?: string;
  invalid?: boolean;
}

// A field typed straight into a grouped-list row, right-aligned against its label.
export function TextRow({ label, value, onChange, placeholder, numeric, suffix, invalid }: TextRowProps): ReactElement {
  const id = useId();
  const styles = invalid === true ? INVALID_INPUT_STYLES : numeric === true ? listRowFigureInputStyles : listRowInputStyles;

  return (
    <ListRow label={label} labelFor={id}>
      <TextInput
        id={id}
        variant="unstyled"
        value={value}
        placeholder={placeholder}
        inputMode={numeric === true ? "numeric" : undefined}
        aria-invalid={invalid}
        styles={styles}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {/* Beside the field rather than inside it, so an emptied field stays empty. */}
      {suffix !== undefined && (
        <Text fz={14} c="text.8" style={{ flexShrink: 0 }}>
          {suffix}
        </Text>
      )}
    </ListRow>
  );
}

function choiceStyle(selected: boolean, fill: boolean): CSSProperties {
  return {
    flex: fill ? "1 1 0" : "0 0 auto",
    // Long labels ("Mullet", "Other") must not force the row wider.
    minWidth: 0,
    height: 36,
    padding: "0 14px",
    borderRadius: 8,
    textAlign: "center",
    fontSize: 13,
    fontWeight: 500,
    // Mock G's filled tile, so a pick reads the same in every grouped list.
    backgroundColor: selected
      ? "color-mix(in srgb, var(--mantine-color-primary-6) 15%, var(--mantine-color-cards-6))"
      : "var(--color-surface-raised)",
    color: selected ? "var(--mantine-color-primary-6)" : "var(--mantine-color-text-6)",
  };
}

interface ChoiceButtonProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
  // Shares the row equally with its siblings instead of keeping its own width.
  fill?: boolean;
}

function ChoiceButton({ label, selected, onSelect, fill = false }: ChoiceButtonProps): ReactElement {
  return (
    <UnstyledButton aria-pressed={selected} onClick={onSelect} style={choiceStyle(selected, fill)}>
      {label}
    </UnstyledButton>
  );
}

// A row whose choices sit under its label, as they do not fit beside it.
function ChoiceBlock({ label, children }: { label: string; children: ReactNode }): ReactElement {
  return (
    <Stack gap={10} py={14}>
      <Text fz={14} c="text.6">
        {label}
      </Text>
      <Group role="group" aria-label={label} gap={8}>
        {children}
      </Group>
    </Stack>
  );
}

function SuspensionRow({
  value,
  onChange,
}: {
  value: SuspensionLayout | null;
  onChange: (layout: SuspensionLayout) => void;
}): ReactElement {
  const { t } = useTranslation();

  return (
    // Wraps the control under its label where the words outgrow the row (Czech) instead of overflowing it.
    <Box
      py={11}
      mih={LIST_ROW_HEIGHT}
      style={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 16, rowGap: 10 }}
    >
      <Text fz={14} c="text.6">
        {t("addBike.suspension")}
      </Text>
      {/* Empty until picked: the wizard asks for it, so nothing is preselected. */}
      <SegmentedControl<SuspensionLayout | "">
        size="xs"
        radius="md"
        // The light scheme draws the dividers near-white on the dark track.
        withItemsBorders={false}
        aria-label={t("addBike.suspension")}
        value={value ?? ""}
        onChange={(layout) => {
          if (layout !== "") onChange(layout);
        }}
        data={[
          { value: "none", label: t("addBike.suspensionNone") },
          { value: "hardtail", label: t("addBike.suspensionHardtail") },
          { value: "full", label: t("addBike.suspensionFull") },
        ]}
        style={{ marginLeft: "auto" }}
      />
    </Box>
  );
}

function EbikeRow({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }): ReactElement {
  const { t } = useTranslation();
  const id = useId();

  return (
    <ListRow label={t("addBike.ebike")} labelFor={id}>
      <Switch
        id={id}
        withThumbIndicator={false}
        checked={checked}
        onChange={(event) => {
          onChange(event.currentTarget.checked);
        }}
        styles={{
          track: {
            backgroundColor: checked ? "var(--mantine-color-primary-6)" : "var(--mantine-color-cards-4)",
            borderColor: "var(--mantine-color-other-borderSolid)",
          },
          thumb: {
            backgroundColor: checked ? "var(--mantine-color-black)" : "var(--mantine-color-text-6)",
          },
        }}
      />
    </ListRow>
  );
}

function PhotoHero({
  photo,
  alt,
  onPickPhoto,
}: {
  photo: string | null;
  alt: string;
  onPickPhoto: (file: File | null) => void;
}): ReactElement {
  const { t } = useTranslation();

  return (
    <FileButton onChange={onPickPhoto} accept="image/*">
      {(props) =>
        photo === null ? (
          // The empty slot is the upload target itself.
          <UnstyledButton {...props} onClick={() => props.onClick()} style={EMPTY_HERO_STYLE}>
            <ImagePlus size={28} color="var(--mantine-color-primary-6)" />
            <Text size="sm" c="text.7">
              {t("addBike.addPhoto")}
            </Text>
          </UnstyledButton>
        ) : (
          <Box pos="relative" bg="white">
            <Image src={photo} alt={alt} h={HERO_HEIGHT} fit="contain" p="sm" />
            {/* Allow replacing scraped photos. */}
            <UnstyledButton {...props} onClick={() => props.onClick()} style={CHANGE_PHOTO_STYLE}>
              <Camera size={14} />
              {t("addBike.changePhoto")}
            </UnstyledButton>
          </Box>
        )
      }
    </FileButton>
  );
}

// The lookup settled the identity, so the wizard names the bike instead of asking again.
function NameRow({ name, year }: { name: string; year: string | null }): ReactElement {
  return (
    <Group justify="space-between" wrap="nowrap" gap="md" mih={LIST_ROW_HEIGHT}>
      <Text fz={14} fw={600} c="text.6" truncate>
        {name}
      </Text>
      {year !== null && (
        <Text fz={14} c="text.8" className="tabular-nums" style={{ flexShrink: 0 }}>
          {year}
        </Text>
      )}
    </Group>
  );
}

interface SetupCardProps {
  categories: string[];
  values: BikeSpecificationValues;
  onChange: BikeSpecificationProps["onChange"];
  mileageLabel: string;
}

function SetupCard({ categories, values, onChange, mileageLabel }: SetupCardProps): ReactElement {
  const { t } = useTranslation();

  // Clear custom length when switching to letter size.
  function selectFrameSize(size: FrameSize): void {
    onChange("frameSize", size);
    if (size !== "other" && values.sizeLength !== "") {
      onChange("sizeLength", "");
    }
  }

  return (
    <GroupedList title={t("addBike.setupGroup")}>
      <BikeCategoryRow
        categories={categories}
        value={values.category}
        onChange={(category) => onChange("category", category)}
      />
      <ChoiceBlock label={t("addBike.wheelSize")}>
        {WHEEL_SIZES.map((size) => (
          <ChoiceButton
            key={size}
            label={size}
            selected={values.wheelSize === size}
            onSelect={() => onChange("wheelSize", size)}
          />
        ))}
      </ChoiceBlock>
      <ChoiceBlock label={t("addBike.frameSize")}>
        {FRAME_SIZES.map((size) => (
          <ChoiceButton
            key={size}
            fill
            label={size === "other" ? t("addBike.frameSizeOther") : size}
            selected={values.frameSize === size}
            onSelect={() => selectFrameSize(size)}
          />
        ))}
      </ChoiceBlock>
      {/* Show custom length only for other frame size. */}
      {values.frameSize === "other" && (
        <TextRow
          label={t("addBike.sizeLength")}
          placeholder={t("addBike.sizeLengthPlaceholder")}
          value={values.sizeLength}
          onChange={(text) => onChange("sizeLength", text)}
        />
      )}
      <SuspensionRow value={values.suspension} onChange={(layout) => onChange("suspension", layout)} />
      <EbikeRow checked={values.ebike} onChange={(checked) => onChange("ebike", checked)} />
      <TextRow
        label={mileageLabel}
        placeholder={t("addBike.currentMileagePlaceholder")}
        numeric
        suffix="km"
        value={values.currentMileage}
        onChange={(text) => onChange("currentMileage", text.replace(/\D/g, ""))}
      />
    </GroupedList>
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
  mileageLabel,
  identity,
}: BikeSpecificationProps): ReactElement {
  const { t } = useTranslation();
  const displayName = bike?.name ?? fallbackName;
  // Prefer local photo over scraped image.
  const shownPhoto = photoUrl ?? (typeof bike?.imageUrl === "string" ? bike.imageUrl : null);

  // Keep focused fields above the fixed footer and keyboard.
  const formRef = useScrollIntoViewOnFocus<HTMLDivElement>("[data-fixed-footer]");

  return (
    <Stack gap="lg" ref={formRef}>
      <GroupedList hero={<PhotoHero photo={shownPhoto} alt={displayName} onPickPhoto={onPickPhoto} />}>
        {identity ?? <NameRow name={displayName} year={year} />}
        <TextRow
          label={t("addBike.bikeName")}
          placeholder={t("addBike.bikeNamePlaceholder")}
          value={values.bikeName}
          onChange={(text) => onChange("bikeName", text)}
        />
      </GroupedList>

      <SetupCard
        categories={categories}
        values={values}
        onChange={onChange}
        mileageLabel={mileageLabel ?? t("addBike.currentMileage")}
      />
    </Stack>
  );
}
