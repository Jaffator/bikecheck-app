// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useState, type ReactElement } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Group,
  Loader,
  NumberInput,
  Paper,
  Stack,
  Text,
  Textarea,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { tapFeedback } from "@/utils/haptics";
import { useCategoryActions } from "@/features/service/service.queries";
import type { CatalogueAction } from "@/features/service/service.types";
import {
  autosizeInputStyles,
  disabledButtonStyles,
  disabledChipStyles,
  inputStyles,
} from "@/features/add_bike_page/formStyles";
import { catalogueLabel, componentLabel, shortComponentLabel } from "@/features/service/serviceLabels";
import { hasSegment, preselectedComponents, type DraftBlock, type PickedAction } from "./serviceWizard.types";

interface ServiceActionsStepProps {
  bikeId: number | null;
  draft: DraftBlock | null;
  canCommit: boolean;
  onToggleAction: (action: CatalogueAction) => void;
  onUpdateAction: (actionId: number, patch: Partial<PickedAction>) => void;
  onToggleActionNote: (actionId: number, text: string) => void;
  onCommit: () => void;
}

// What was done and to which parts. The category being worked on is a draft until the
// user confirms it, so a category opened by mistake never reaches the Summary (ADR 0006).
export function ServiceActionsStep({
  bikeId,
  draft,
  canCommit,
  onToggleAction,
  onUpdateAction,
  onToggleActionNote,
  onCommit,
}: ServiceActionsStepProps): ReactElement {
  const { t } = useTranslation();
  const { data: category, isLoading, isError } = useCategoryActions(bikeId, draft?.categoryId ?? null);
  // One action open at a time, as on the bike's component step.
  const [openActionId, setOpenActionId] = useState<number | null>(null);

  const picked = draft?.actions ?? [];
  const pickedById = new Map(picked.map((action) => [action.actionId, action]));
  // Editing an existing block may end with every action removed, which removes the block.
  const editing = draft !== null && draft.editingIndex !== null;

  function toggleOpen(actionId: number): void {
    setOpenActionId((current) => (current === actionId ? null : actionId));
  }

  return (
    <Stack gap="md">
      <Text fw={600} fz={15} c="text.6">
        {catalogueLabel(draft?.categoryI18nKey ?? null, draft?.categoryName ?? "", t)}
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
          opened={openActionId === action.id}
          onToggleOpen={() => toggleOpen(action.id)}
          onToggle={() => {
            onToggleAction(action);
            setOpenActionId(pickedById.has(action.id) ? null : action.id);
          }}
          onUpdate={(patch) => onUpdateAction(action.id, patch)}
          onToggleNote={(text) => onToggleActionNote(action.id, text)}
        />
      ))}

      <Button
        color="primary.6"
        radius="md"
        disabled={!canCommit}
        styles={disabledButtonStyles}
        onClick={() => {
          void tapFeedback();
          onCommit();
        }}
        style={{ height: "3rem" }}
      >
        {editing ? t("addService.saveChanges") : t("addService.addServiceAction")}
      </Button>
    </Stack>
  );
}

// One catalogue Action: a tick, and everything the tick reveals. The header opens even
// an unticked action, so the tags can be read before the user commits to it.
function ActionRow({
  action,
  picked,
  opened,
  onToggleOpen,
  onToggle,
  onUpdate,
  onToggleNote,
}: {
  action: CatalogueAction;
  picked: PickedAction | undefined;
  opened: boolean;
  onToggleOpen: () => void;
  onToggle: () => void;
  onUpdate: (patch: Partial<PickedAction>) => void;
  onToggleNote: (text: string) => void;
}): ReactElement {
  const { t } = useTranslation();

  // A closed but ticked action still says which parts it was performed on.
  const summary =
    picked && !opened
      ? action.components
          .filter((component) => picked.componentIds.includes(component.id))
          .map((component) => componentLabel(component, t))
          .join(", ")
      : "";

  return (
    <Paper
      radius="lg"
      style={{
        // Colour, glow and inner edge all live in this one object: `bg` would emit the
        // `background` shorthand and wipe the gradient - see docs/ui/card-surface.md.
        backgroundColor: "var(--mantine-color-cards-6)",
        backgroundImage:
          "radial-gradient(90% 120% at 0% 0%, color-mix(in srgb, var(--mantine-color-primary-6) 7%, transparent) 0%, transparent 45%)",
        border: opened ? "1px solid var(--mantine-color-primary-6)" : "1px solid var(--color-border-subtle)",
        boxShadow:
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.35), 0 8px 16px -6px rgba(0, 0, 0, 0.5)",
      }}
    >
      <Group gap="sm" wrap="nowrap" p="md" align="flex-start">
        <Checkbox
          checked={picked !== undefined}
          color="primary.6"
          aria-label={catalogueLabel(action.action_i18n_key, action.action_name, t)}
          onChange={() => {
            void tapFeedback();
            onToggle();
          }}
        />

        <UnstyledButton
          onClick={() => {
            void tapFeedback();
            onToggleOpen();
          }}
          aria-expanded={opened}
          style={{ flex: 1, minWidth: 0 }}
        >
          <Group justify="space-between" wrap="nowrap" gap="sm" align="flex-start">
            <Stack gap={2} style={{ minWidth: 0 }}>
              <Text fw={600} fz={15} c="text.6">
                {catalogueLabel(action.action_i18n_key, action.action_name, t)}
              </Text>
              {summary !== "" && (
                <Text fz={13} c="var(--color-text-dim)" lineClamp={1}>
                  {summary}
                </Text>
              )}
            </Stack>
            <Box c={opened ? "primary.6" : "var(--color-text-dim)"} style={{ flexShrink: 0, display: "flex" }}>
              {opened ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Box>
          </Group>
        </UnstyledButton>
      </Group>

      {opened && (
        <Stack gap="sm" px="md" pb="md" pl="calc(1rem + 2.25rem)">
          {/* The parts are shown before the action is ticked, so the user can see what it
              would be recorded against; until then they say nothing and take no input. */}
          {action.components.length > 0 && (
            <Stack gap={6}>
              <Text fz={13} c="text.6">
                {t("addService.componentsLabel")}
              </Text>
              <Chip.Group
                multiple
                value={(picked?.componentIds ?? preselectedComponents(action.components)).map(String)}
                onChange={(value) => onUpdate({ componentIds: value.map(Number) })}
              >
                <Group gap="xs">
                  {action.components.map((component) => (
                    <Chip
                      key={component.id}
                      value={String(component.id)}
                      radius="xl"
                      size="sm"
                      color="primary.6"
                      disabled={picked === undefined}
                      styles={picked === undefined ? disabledChipStyles : undefined}
                    >
                      {shortComponentLabel(component, t)}
                    </Chip>
                  ))}
                </Group>
              </Chip.Group>
            </Stack>
          )}

          {/* A warning, not a block: work the user cannot attribute is still work. */}
          {picked && picked.componentIds.length === 0 && (
            <Group gap={6} wrap="nowrap">
              <AlertTriangle size={14} color="var(--mantine-color-yellow-5)" style={{ flexShrink: 0 }} />
              <Text fz={13} c="yellow.5">
                {t("addService.noComponentWarning")}
              </Text>
            </Group>
          )}

          {/* A tag chip is lit while the note says what it says, so tapping it writes its
              name in or takes it back out again. The note is the only thing either
              direction reads, which is why editing the text by hand moves the chips —
              see ADR 0005. Taking a chip is itself a claim that the action happened. */}
          {action.tags.length > 0 && (
            <Stack gap={6}>
              <Text fz={13} c="text.6">
                {t("addService.tagsLabel")}
              </Text>
              <Group gap="xs">
                {action.tags.map((tag) => (
                  <Chip
                    key={tag.tag}
                    checked={hasSegment(picked?.note ?? "", catalogueLabel(tag.i18n_key, tag.tag, t))}
                    radius="xl"
                    size="sm"
                    color="primary.6"
                    onChange={() => {
                      void tapFeedback();
                      if (picked === undefined) onToggle();
                      onToggleNote(catalogueLabel(tag.i18n_key, tag.tag, t));
                    }}
                  >
                    {catalogueLabel(tag.i18n_key, tag.tag, t)}
                  </Chip>
                ))}
              </Group>
            </Stack>
          )}

          {/* Whatever the chips wrote is the user's to rewrite. */}
          <Textarea
            label={t("addService.actionNote")}
            placeholder={t("addService.actionNotePlaceholder")}
            value={picked?.note ?? ""}
            disabled={picked === undefined}
            autosize
            minRows={1}
            maxLength={500}
            styles={autosizeInputStyles}
            onChange={(event) => onUpdate({ note: event.currentTarget.value })}
          />

          {picked && (
            <>
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
            </>
          )}
        </Stack>
      )}

    </Paper>
  );
}
