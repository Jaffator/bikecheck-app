// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useState, type ReactElement } from "react";
import {
  Anchor,
  Button,
  Checkbox,
  Chip,
  Group,
  Loader,
  NumberInput,
  Paper,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Plus } from "lucide-react";
import { tapFeedback } from "@/utils/haptics";
import { useCategoryActions } from "@/features/service/service.queries";
import type { CatalogueAction } from "@/features/service/service.types";
import { inputStyles } from "@/features/add_bike_page/formStyles";
import { catalogueLabel, componentLabel, tagLine } from "@/features/service/serviceLabels";
import { today, type CategoryBlock, type PickedAction } from "./serviceWizard.types";

interface ServiceActionsStepProps {
  bikeId: number | null;
  block: CategoryBlock | undefined;
  blockIndex: number;
  blockCount: number;
  serviceDate: string;
  onServiceDateChange: (day: string) => void;
  onToggleAction: (action: CatalogueAction) => void;
  onUpdateAction: (actionId: number, patch: Partial<PickedAction>) => void;
  onAnotherCategory: () => void;
  onNext: () => void;
}

// What was done, to which parts, and when. One visit that touched three things is one
// record, so this step is entered once per Component Category and adds to the same Service.
export function ServiceActionsStep({
  bikeId,
  block,
  blockIndex,
  blockCount,
  serviceDate,
  onServiceDateChange,
  onToggleAction,
  onUpdateAction,
  onAnotherCategory,
  onNext,
}: ServiceActionsStepProps): ReactElement {
  const { t } = useTranslation();
  const { data: category, isLoading, isError } = useCategoryActions(bikeId, block?.categoryId ?? null);

  const picked = block?.actions ?? [];
  const pickedById = new Map(picked.map((action) => [action.actionId, action]));

  return (
    <Stack gap="md">
      {/* The date belongs to the visit, not to the block, so it is asked once and then
          shown as settled — openable, because a mistake on the first block is fixable. */}
      <ServiceDateField
        day={serviceDate}
        settled={blockIndex > 0}
        onChange={onServiceDateChange}
      />

      <Text fw={600} fz={15} c="text.6">
        {/* Tells the user which block they are in and how many the Service carries. */}
        {t("addService.blockBreadcrumb", {
          category: catalogueLabel(block?.categoryI18nKey ?? null, block?.categoryName ?? "", t),
          current: blockIndex + 1,
          total: blockCount,
        })}
      </Text>

      {isLoading && (
        <Group justify="center" p="xl">
          <Loader size="sm" />
        </Group>
      )}

      {isError && (
        <Text size="sm" c="red.5">
          {t("addService.actionsFailed")}
        </Text>
      )}

      {category?.actions.length === 0 && (
        <Text fz={14} c="var(--color-text-dim)">
          {t("addService.noActions")}
        </Text>
      )}

      {category?.actions.map((action) => (
        <ActionRow
          key={action.id}
          action={action}
          picked={pickedById.get(action.id)}
          onToggle={() => onToggleAction(action)}
          onUpdate={(patch) => onUpdateAction(action.id, patch)}
        />
      ))}

      <Button
        variant="outline"
        color="secondary.6"
        radius="md"
        leftSection={<Plus size={16} />}
        onClick={() => {
          void tapFeedback();
          onAnotherCategory();
        }}
        style={{ alignSelf: "flex-start" }}
      >
        {t("addService.anotherCategory")}
      </Button>

      <Button
        color="primary.6"
        radius="md"
        disabled={picked.length === 0}
        onClick={() => {
          void tapFeedback();
          onNext();
        }}
        style={{ height: "3rem" }}
      >
        {t("addService.toReview")}
      </Button>
    </Stack>
  );
}

// The date the work happened, which may be months before it was written down.
function ServiceDateField({
  day,
  settled,
  onChange,
}: {
  day: string;
  settled: boolean;
  onChange: (day: string) => void;
}): ReactElement {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);

  if (settled && !opened) {
    return (
      <Group gap="sm" wrap="nowrap">
        <Text fz={14} c="var(--color-text-dim)">
          {t("addService.serviceDate")}: {day}
        </Text>
        <Anchor component="button" type="button" fz={13} c="primary.5" onClick={() => setOpened(true)}>
          {t("addService.changeDate")}
        </Anchor>
      </Group>
    );
  }

  return (
    <TextInput
      type="date"
      label={t("addService.serviceDate")}
      value={day}
      // Work cannot have been done later than today.
      max={today()}
      styles={inputStyles}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  );
}

// One catalogue Action: a tick, and everything the tick reveals.
function ActionRow({
  action,
  picked,
  onToggle,
  onUpdate,
}: {
  action: CatalogueAction;
  picked: PickedAction | undefined;
  onToggle: () => void;
  onUpdate: (patch: Partial<PickedAction>) => void;
}): ReactElement {
  const { t } = useTranslation();

  return (
    <Paper
      radius="lg"
      p="md"
      style={{
        // Colour, glow and inner edge all live in this one object: `bg` would emit the
        // `background` shorthand and wipe the gradient - see docs/ui/card-surface.md.
        backgroundColor: "var(--mantine-color-cards-6)",
        backgroundImage:
          "radial-gradient(90% 120% at 0% 0%, color-mix(in srgb, var(--mantine-color-primary-6) 7%, transparent) 0%, transparent 45%)",
        border: "1px solid var(--color-border-subtle)",
        boxShadow:
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.35), 0 8px 16px -6px rgba(0, 0, 0, 0.5)",
      }}
    >
      <Stack gap="sm">
        <Checkbox
          checked={picked !== undefined}
          color="primary.6"
          label={
            <Text fw={600} fz={15} c="text.6">
              {catalogueLabel(action.action_i18n_key, action.action_name, t)}
            </Text>
          }
          onChange={() => {
            void tapFeedback();
            onToggle();
          }}
        />

        {picked && (
          <Stack gap="sm" pl="xl">
            {/* Plain descriptive text: the tags say what the job covers, and are never
                confirmed item by item — see ADR 0004. */}
            {action.tags.length > 0 && (
              <Text fz={13} c="var(--color-text-dim)">
                {tagLine(action.tags, t)}
              </Text>
            )}

            {action.components.length > 0 && (
              <Chip.Group
                multiple
                value={picked.componentIds.map(String)}
                onChange={(value) => onUpdate({ componentIds: value.map(Number) })}
              >
                <Group gap="xs">
                  {action.components.map((component) => (
                    <Chip key={component.id} value={String(component.id)} radius="xl" size="sm" color="primary.6">
                      {componentLabel(component, t)}
                    </Chip>
                  ))}
                </Group>
              </Chip.Group>
            )}

            {/* A warning, not a block: work the user cannot attribute is still work. */}
            {picked.componentIds.length === 0 && (
              <Group gap={6} wrap="nowrap">
                <AlertTriangle size={14} color="var(--mantine-color-yellow-5)" style={{ flexShrink: 0 }} />
                <Text fz={13} c="yellow.5">
                  {t("addService.noComponentWarning")}
                </Text>
              </Group>
            )}

            {action.replace_action && (
              <TextInput
                label={t("addService.newPart")}
                placeholder={t("addService.newPartPlaceholder")}
                value={picked.newDescription}
                styles={inputStyles}
                onChange={(event) => onUpdate({ newDescription: event.currentTarget.value })}
              />
            )}

            <NumberInput
              label={t("addService.partialCost")}
              placeholder={t("addService.partialCostPlaceholder")}
              value={picked.partialCost ?? ""}
              min={0}
              hideControls
              styles={inputStyles}
              // An emptied field means no figure was recorded, not a price of zero.
              onChange={(value) => onUpdate({ partialCost: value === "" ? null : Number(value) })}
            />
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
