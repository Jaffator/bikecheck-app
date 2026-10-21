// PROTOTYPE (proto/desktop-wizards): the summary before saving, wide and in two columns - every part, filled or not.
import { type ReactElement } from "react";
import { Box, Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { componentTypeId, groupComponents, positionsOf, readEntry } from "../bikeComponents.types";
import type { AddBikeWizard } from "../useAddBikeWizard";
import { COPY } from "./bikeProto";

function translatedName(i18nKey: string | null, fallback: string, translate: (key: string) => string): string {
  return i18nKey ? translate(i18nKey) : fallback;
}

interface BikeSummaryDesktopProps {
  wizard: AddBikeWizard;
  onConfirm: () => void;
}

export function BikeSummaryDesktop({ wizard, onConfirm }: BikeSummaryDesktopProps): ReactElement {
  const { t } = useTranslation();
  const { specification, componentEntries, splitComponents, disabledComponents } = wizard;
  const { brand, model, year } = wizard.form.values;
  const grouped = groupComponents(wizard.componentGroups ?? [], wizard.defaultComponents ?? []);
  const notSpecified = t("addBike.summaryNotSpecified");

  const frame = specification.frameSize === "other" ? specification.sizeLength.trim() : (specification.frameSize ?? "");
  const headline = [
    [brand, model].filter((part) => part.trim() !== "").join(" "),
    year,
    specification.category,
    frame === "" ? null : `${COPY.frame.toLowerCase()} ${frame}`,
    specification.wheelSize === null ? null : `${COPY.wheels.toLowerCase()} ${specification.wheelSize}`,
  ]
    .filter((part) => part !== null && part !== "")
    .join(" · ");

  return (
    <Modal
      opened={wizard.summaryOpen}
      onClose={wizard.closeSummary}
      centered
      size={840}
      radius="lg"
      title={
        <Box>
          <Text fw={700} fz={18} c="text.6">
            {t("addBike.summaryTitle")}
          </Text>
          <Text fz={13} c="var(--color-text-dim)" mt={4}>
            {headline}
          </Text>
        </Box>
      }
      styles={{
        content: { backgroundColor: "var(--mantine-color-cards-6)" },
        header: { backgroundColor: "var(--mantine-color-cards-6)", alignItems: "flex-start" },
      }}
    >
      <Stack gap="lg">
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "1.25rem 2rem",
            maxHeight: "60vh",
            overflowY: "auto",
          }}
        >
          {grouped.map(({ group, components }) => (
            <Box key={group.id}>
              <Text fz={11} fw={600} tt="uppercase" lts="var(--tracking-label)" c="primary.6" mb={6}>
                {translatedName(group.i18n_key, group.group_name, t)}
              </Text>
              {components.flatMap((component) => {
                const typeId = componentTypeId(component);
                const absent = disabledComponents.has(typeId);
                const name = translatedName(component.component_i18n_key, component.component_name, t);
                const positions = absent ? (["none"] as const) : positionsOf(component, splitComponents);

                return positions.map((position) => {
                  const description = readEntry(componentEntries, typeId, position).description.trim();
                  const side =
                    position === "none" ? "" : ` (${t(`addBike.position${position === "front" ? "Front" : "Rear"}`)})`;
                  const value = absent ? t("addBike.partAbsentUndo") : description || notSpecified;
                  return (
                    <Group key={`${String(typeId)}:${position}`} gap={12} wrap="nowrap" align="flex-start" py={4}>
                      <Text fz={13} c="var(--color-text-dim)" style={{ flex: "0 0 9rem" }}>
                        {name}
                        {side}
                      </Text>
                      <Text fz={13} c={!absent && description !== "" ? "text.6" : "text.9"} style={{ minWidth: 0 }}>
                        {value}
                      </Text>
                    </Group>
                  );
                });
              })}
            </Box>
          ))}
        </Box>

        <Group justify="flex-end" gap={10} pt="md" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
          <Button variant="outline" radius="md" onClick={wizard.closeSummary} style={{ height: "2.6rem" }}>
            {t("addBike.summaryEdit")}
          </Button>
          <Button
            color="primary.6"
            c="textDark.6"
            radius="md"
            leftSection={<Check size={16} />}
            onClick={onConfirm}
            style={{ height: "2.6rem" }}
          >
            {t("addBike.summaryConfirm")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
