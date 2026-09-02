// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { type ReactElement } from "react";
import { Alert, Button, Divider, Group, Modal, ScrollArea, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Check, Pencil, TriangleAlert } from "lucide-react";
import type { AssembleBikeComponent } from "../components/components.types";
import type { BikeSpecificationValues } from "./bikeSpecification.types";
import type { AddBikeIdentityValues } from "./useAddBikeWizard";
import { disabledButtonStyles } from "./formStyles";
import { useOverlayBack } from "@/hooks/useOverlayBack";

interface AddBikeSummaryModalProps {
  opened: boolean;
  onClose: () => void;
  identity: AddBikeIdentityValues;
  specification: BikeSpecificationValues;
  // Contains only persisted component records.
  components: AssembleBikeComponent[];
  onConfirm: () => void;
  isSaving: boolean;
  isError: boolean;
  // One line per field the server rejected; empty when the failure had no detail.
  errorDetails: string[];
}

// Use the local name when a component has no translation key.
function translatedName(i18nKey: string | null, fallback: string, translate: (key: string) => string): string {
  return i18nKey ? translate(i18nKey) : fallback;
}

// One line per fact, so the summary stays scannable on a phone.
function SummaryRow({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <Group justify="space-between" gap="sm" wrap="nowrap" align="flex-start">
      <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
        {label}
      </Text>
      <Text size="sm" fw={500} ta="right">
        {value}
      </Text>
    </Group>
  );
}

export function AddBikeSummaryModal({
  opened,
  onClose,
  identity,
  specification,
  components,
  onConfirm,
  isSaving,
  isError,
  errorDetails,
}: AddBikeSummaryModalProps): ReactElement {
  const { t } = useTranslation();

  const notSpecified = t("addBike.summaryNotSpecified");
  const bikeName = [identity.brand, identity.model].filter((part) => part.trim() !== "").join(" ");

  // Use custom frame length only for the other size option.
  const frameSize = specification.frameSize === "other" ? specification.sizeLength.trim() : (specification.frameSize ?? "");

  // Android's back gesture dismisses this rather than the page under it.
  useOverlayBack(opened, onClose);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("addBike.summaryTitle")}
      centered
      radius="md"
      // Scroll long component lists inside the modal.
      scrollAreaComponent={ScrollArea.Autosize}
      styles={{ title: { fontWeight: 600 } }}
    >
      <Stack gap="md">
        <Stack gap="xs">
          <Text size="xs" tt="uppercase" c="dimmed" fw={600}>
            {t("addBike.summaryBike")}
          </Text>
          <SummaryRow label={t("addBike.brand")} value={bikeName || notSpecified} />
          {specification.bikeName.trim() !== "" && (
            <SummaryRow label={t("addBike.bikeName")} value={specification.bikeName.trim()} />
          )}
          <SummaryRow label={t("addBike.year")} value={identity.year ?? notSpecified} />
          <SummaryRow
            label={t("addBike.currentMileage")}
            value={specification.currentMileage ? `${specification.currentMileage} km` : notSpecified}
          />
          <SummaryRow label={t("addBike.category")} value={specification.category ?? notSpecified} />
          <SummaryRow
            label={t("addBike.suspension")}
            value={
              specification.suspension
                ? t(
                    `addBike.suspension${
                      specification.suspension.charAt(0).toUpperCase() + specification.suspension.slice(1)
                    }`,
                  )
                : notSpecified
            }
          />
          <SummaryRow label={t("addBike.frameSize")} value={frameSize || notSpecified} />
          <SummaryRow label={t("addBike.wheelSize")} value={specification.wheelSize ?? notSpecified} />
          <SummaryRow label={t("addBike.ebike")} value={specification.ebike ? "✓" : "—"} />
        </Stack>

        <Divider />

        <Stack gap="xs">
          <Group justify="space-between" gap="sm">
            <Text size="xs" tt="uppercase" c="dimmed" fw={600}>
              {t("addBike.summaryComponents")}
            </Text>
            <Text size="xs" c="dimmed">
              {t("addBike.componentsFound", { count: components.length })}
            </Text>
          </Group>

          {components.length === 0 ? (
            <Text size="sm" c="dimmed">
              {t("addBike.summaryNoComponents")}
            </Text>
          ) : (
            <Stack gap={6}>
              {components.map((component, index) => {
                const position = component.component.position;
                const label = translatedName(component.component_i18n_key, component.component_name, t);

                return (
                  <Group
                    // Include index to distinguish component sides.
                    key={`${component.component.component_type_id}:${position ?? "none"}:${index}`}
                    justify="space-between"
                    gap="sm"
                    wrap="nowrap"
                    align="flex-start"
                  >
                    <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
                      {position ? `${label} (${t(`addBike.position${position === "front" ? "Front" : "Rear"}`)})` : label}
                    </Text>
                    <Text size="sm" fw={500} ta="right">
                      {component.component.component_desc ?? notSpecified}
                    </Text>
                  </Group>
                );
              })}
            </Stack>
          )}
        </Stack>

        {isError && (
          <Alert color="red" variant="light" icon={<TriangleAlert size={16} />}>
            <Stack gap={4}>
              <Text size="sm">{t("addBike.saveFailed")}</Text>
              {/* Show server validation details for correction. */}
              {errorDetails.map((detail) => (
                <Text key={detail} size="xs" c="dimmed">
                  {detail}
                </Text>
              ))}
            </Stack>
          </Alert>
        )}

        <Group gap="sm" grow>
          <Button
            variant="outline"
            color="cards.9"
            leftSection={<Pencil size={14} />}
            onClick={onClose}
            disabled={isSaving}
            style={{ height: "3rem" }}
          >
            {t("addBike.summaryEdit")}
          </Button>
          <Button
            leftSection={<Check size={18} />}
            onClick={onConfirm}
            loading={isSaving}
            radius="sm"
            styles={disabledButtonStyles}
            style={{ height: "3rem" }}
          >
            {t("addBike.summaryConfirm")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
