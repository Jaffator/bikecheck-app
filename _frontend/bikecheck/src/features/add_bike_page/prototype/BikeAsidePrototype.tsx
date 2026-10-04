// PROTOTYPE (proto/desktop-wizards): "Tvoje kolo" - the bike as it stands so far, and the step's way on.
import { type ReactElement } from "react";
import { Box, Button, FileButton, Group, Image, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Camera, Check, ChevronRight } from "lucide-react";
import { countConfigured, countFields, groupComponents } from "../bikeComponents.types";
import { disabledButtonStyles } from "../formStyles";
import type { AddBikeWizard } from "../useAddBikeWizard";
import { COPY, cardSurface, imageSrc } from "./bikeProto";

// Clears the 3rem header plus a rem of air.
const ASIDE_TOP = "4rem";

const BUTTON_HEIGHT = "2.6rem";

export function BikeAsidePrototype({ wizard }: { wizard: AddBikeWizard }): ReactElement {
  const { t } = useTranslation();
  const { active, confirmedBike } = wizard;
  const { brand, model, year } = wizard.form.values;

  // Step 1 shows the match under the cursor; later steps show the bike that was confirmed.
  const picked =
    active === 0 ? (wizard.searchResults?.find((result) => result.bikeUrl === wizard.selectedBikeUrl) ?? null) : confirmedBike;
  const photo = (active === 0 ? null : wizard.photoUrl) ?? imageSrc(picked);
  const typedName = `${brand} ${model}`.trim();
  const name = picked?.name ?? typedName;
  const brandLine = picked?.bikeBrand ?? year ?? "";
  const hasBike = picked !== null || (active > 0 && typedName !== "");

  return (
    <Paper
      component="aside"
      aria-label={COPY.yourBike}
      radius="lg"
      p="lg"
      style={{ ...cardSurface, position: "sticky", top: ASIDE_TOP }}
    >
      <Stack gap="md">
        <Text fz={11} fw={600} tt="uppercase" lts="var(--tracking-label)" c="var(--color-text-dim)">
          {COPY.yourBike}
        </Text>

        {!hasBike && (
          <Box
            px="md"
            py={28}
            ta="center"
            style={{ border: "1px dashed var(--mantine-color-cards-4)", borderRadius: "0.75rem" }}
          >
            <Text fw={600} fz={14} c="text.6">
              {COPY.nothingPicked}
            </Text>
            <Text fz={13} c="var(--color-text-dim)" mt={6}>
              {COPY.nothingPickedBody}
            </Text>
          </Box>
        )}

        {hasBike && (
          <Stack gap="sm">
            {photo !== null && <Image src={photo} alt={name} h={150} fit="contain" bg="white" radius="md" />}
            <Box>
              <Text fz={13} c="var(--color-text-dim)">
                {brandLine}
              </Text>
              <Text fz={18} fw={700} c="text.6" lts="var(--tracking-title)">
                {name}
              </Text>
            </Box>
          </Stack>
        )}

        {active === 1 && <SpecSummary wizard={wizard} hasPhoto={photo !== null} />}
        {active === 2 && <PartsProgress wizard={wizard} />}

        {active === 0 && (
          <Stack gap={8}>
            <Button
              color="primary.6"
              c={wizard.selectedBikeUrl !== null ? "textDark.6" : undefined}
              radius="md"
              leftSection={<Check size={16} />}
              disabled={wizard.selectedBikeUrl === null}
              styles={disabledButtonStyles}
              style={{ height: BUTTON_HEIGHT }}
              onClick={wizard.confirmSelection}
            >
              {t("addBike.confirmSelection")}
            </Button>
            <Button variant="transparent" c="text.6" td="underline" onClick={wizard.enterManually}>
              {COPY.notListed}
            </Button>
          </Stack>
        )}

        {active === 1 && (
          <Group gap={10} wrap="nowrap">
            <Button variant="outline" radius="md" onClick={wizard.prevStep} style={{ flex: 1, height: BUTTON_HEIGHT }}>
              {t("action.back")}
            </Button>
            <Button
              color="primary.6"
              c={wizard.canAdvance ? "textDark.6" : undefined}
              radius="md"
              rightSection={<ChevronRight size={16} />}
              disabled={!wizard.canAdvance}
              styles={disabledButtonStyles}
              style={{ flex: 2, height: BUTTON_HEIGHT }}
              onClick={wizard.nextStep}
            >
              {t("addBike.nextStep")}
            </Button>
          </Group>
        )}

        {active === 2 && (
          <Group gap={10} wrap="nowrap">
            <Button variant="outline" radius="md" onClick={wizard.prevStep} style={{ flex: 1, height: BUTTON_HEIGHT }}>
              {t("action.back")}
            </Button>
            <Button
              color="primary.6"
              c="textDark.6"
              radius="md"
              leftSection={<Check size={16} />}
              style={{ flex: 2, height: BUTTON_HEIGHT }}
              onClick={wizard.openSummary}
            >
              {t("addBike.saveBike")}
            </Button>
          </Group>
        )}
      </Stack>
    </Paper>
  );
}

// The form on the left, read back as it is typed.
function SpecSummary({ wizard, hasPhoto }: { wizard: AddBikeWizard; hasPhoto: boolean }): ReactElement {
  const { t } = useTranslation();
  const values = wizard.specification;
  const notSpecified = t("addBike.summaryNotSpecified");
  const frame = values.frameSize === "other" ? values.sizeLength.trim() : (values.frameSize ?? "");
  const suspensionKey: Record<string, string> = {
    hardtail: "addBike.suspensionHardtail",
    full: "addBike.suspensionFull",
    none: "addBike.suspensionNone",
  };
  const rows: [string, string][] = [
    [t("addBike.bikeName"), values.bikeName.trim() || COPY.unnamed],
    [COPY.mileage, values.currentMileage ? `${values.currentMileage} km` : COPY.notEntered],
    [t("addBike.category"), values.category ?? notSpecified],
    [t("addBike.suspension"), values.suspension ? t(suspensionKey[values.suspension]) : notSpecified],
    [COPY.frame, frame || notSpecified],
    [COPY.wheels, values.wheelSize ?? notSpecified],
  ];

  return (
    <Stack gap={14}>
      <FileButton onChange={wizard.pickPhoto} accept="image/*">
        {(props) => (
          <Button
            {...props}
            variant="outline"
            radius="md"
            leftSection={<Camera size={16} color="var(--mantine-color-primary-5)" />}
          >
            {hasPhoto ? t("addBike.changePhoto") : t("addBike.addPhoto")}
          </Button>
        )}
      </FileButton>
      <Stack gap={6} component="dl" m={0}>
        {rows.map(([label, value]) => (
          <Group key={label} justify="space-between" gap={12} wrap="nowrap" align="flex-start">
            <Text component="dt" fz={13} c="var(--color-text-dim)">
              {label}
            </Text>
            <Text component="dd" m={0} fz={13} fw={600} c="text.6" ta="right" className="tabular-nums">
              {value}
            </Text>
          </Group>
        ))}
      </Stack>
    </Stack>
  );
}

function PartsProgress({ wizard }: { wizard: AddBikeWizard }): ReactElement {
  const grouped = groupComponents(wizard.componentGroups ?? [], wizard.defaultComponents ?? []);
  const all = grouped.flatMap((entry) => entry.components);
  const filled = countConfigured(wizard.componentEntries, all, wizard.splitComponents, wizard.disabledComponents);
  const fields = countFields(all, wizard.splitComponents, wizard.disabledComponents);
  const percent = fields === 0 ? 0 : Math.round((filled / fields) * 100);

  return (
    <Stack gap={8}>
      <Group justify="space-between" gap={12}>
        <Text fz={13} c="var(--color-text-dim)">
          {COPY.filledParts}
        </Text>
        <Text fz={13} fw={600} c="text.6" className="tabular-nums">
          {filled} {COPY.of} {fields}
        </Text>
      </Group>
      <Box h={6} bg="cards.8" style={{ borderRadius: 3 }}>
        <Box h={6} w={`${String(percent)}%`} bg="primary.6" style={{ borderRadius: 3 }} />
      </Box>
      <Text fz={13} c="var(--color-text-dim)">
        {COPY.fillLater}
      </Text>
    </Stack>
  );
}
