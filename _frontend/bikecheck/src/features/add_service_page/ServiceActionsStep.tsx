// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactElement } from "react";
import { Box, Button, Checkbox, Chip, Group, Loader, Stack, Text, Textarea, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Banknote, Check, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useHeaderStore } from "@/store/store";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import { useScrollIntoViewOnFocus } from "@/hooks/useScrollIntoViewOnFocus";
import { PINNED_BAR_LEFT, PINNED_BAR_WIDTH } from "@/layout/contentWidth";
import { GroupedList } from "@/components/GroupedList";
import { LIST_ROW_HEIGHT } from "@/components/groupedListStyles";
import { PANEL_HAIRLINE } from "@/components/panelRows";
import { useCategoryActions } from "@/features/service/service.queries";
import { useCurrentUser } from "@/features/users/users.queries";
import { currencySymbol } from "@/utils/money";
import type { ActionTag, CatalogueAction, MountedComponent } from "@/features/service/service.types";
import {
  autosizeInputStyles,
  chipStyles,
  disabledButtonStyles,
  lightFieldLabel,
} from "@/features/add_bike_page/formStyles";
import { catalogueLabel, componentTypeLabel, shortComponentLabel } from "@/features/service/serviceLabels";
import { categoryIcon } from "@/features/service/ui/categoryIcon";
import { componentTypeIcon } from "@/features/service/ui/componentIcon";
import { NoteRow } from "@/features/service/ui/NoteRow";
import { PriceRow } from "@/features/service/ui/PriceRow";
import { CustomTagDrawer } from "./CustomTagDrawer";
import type { DraftBlock, PickedAction } from "./serviceWizard.types";

const HEADING_ICON_SIZE = 22;

// The pinned bar floats over the page, so the last field needs room to scroll clear of it.
// See docs/ui/pinned-action-bar.md.
const BAR_CLEARANCE = "5rem";

interface ServiceActionsStepProps {
  bikeId: number | null;
  draft: DraftBlock | null;
  canCommit: boolean;
  // What the draft's actions cost so far, tallied from what was typed into them.
  draftCost: number;
  onToggleAction: (action: CatalogueAction) => void;
  onUpdateAction: (actionId: number, patch: Partial<PickedAction>) => void;
  onToggleActionTag: (actionId: number, tagName: string) => void;
  onCommit: () => void;
}

// What was done and to which parts. The category being worked on is a draft until the
// user confirms it, so a category opened by mistake never reaches the Summary (ADR 0006).
export function ServiceActionsStep({
  bikeId,
  draft,
  canCommit,
  draftCost,
  onToggleAction,
  onUpdateAction,
  onToggleActionTag,
  onCommit,
}: ServiceActionsStepProps): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: user } = useCurrentUser();
  const { data: category, isLoading, isError } = useCategoryActions(bikeId, draft?.categoryId ?? null);
  const keyboardOffset = useKeyboardOffset();
  // A price near the end of the list would otherwise be focused behind the bar.
  const listRef = useScrollIntoViewOnFocus<HTMLDivElement>("[data-fixed-footer]");
  // One action open at a time, as on the bike's component step. A block arriving with one
  // job already ticked - a linked one (ADR 0030), or a saved one reopened - opens on it.
  const [openActionId, setOpenActionId] = useState<number | null>(() =>
    draft !== null && draft.actions.length === 1 ? draft.actions[0].actionId : null,
  );
  const setHeaderTitleSlot = useHeaderStore((state) => state.setTitleSlot);

  // The category being worked on is the header's title here: a step spent inside one
  // category says which one, rather than repeating what the step is for. Kept off the
  // page itself so the same name is never on screen twice.
  const categoryName = draft?.categoryName ?? "";
  const categoryI18nKey = draft?.categoryI18nKey ?? null;
  useEffect(() => {
    setHeaderTitleSlot(
      <Group gap="xs" align="center" wrap="nowrap" style={{ minWidth: 0 }}>
        {categoryIcon(categoryName, HEADING_ICON_SIZE)}
        <Text fw={700} size="lg" c="text.6" lineClamp={1}>
          {catalogueLabel(categoryI18nKey, categoryName, t)}
        </Text>
      </Group>,
    );
    return () => setHeaderTitleSlot(null);
  }, [categoryName, categoryI18nKey, t, setHeaderTitleSlot]);

  const picked = draft?.actions ?? [];
  const pickedById = new Map(picked.map((action) => [action.actionId, action]));
  // Maintenance works on a part that stays; a Replacement ends it and begins a new one
  // (ADR 0003), so the two are worth telling apart before the user ticks either.
  const serviceActions = category?.actions.filter((action) => !action.replace_action) ?? [];
  const replacementActions = category?.actions.filter((action) => action.replace_action) ?? [];
  // Editing an existing block may end with every action removed, which removes the block.
  const editing = draft !== null && draft.editingIndex !== null;

  function toggleOpen(actionId: number): void {
    setOpenActionId((current) => (current === actionId ? null : actionId));
  }

  // Ticking opens the row; unticking closes it and leaves any other open row alone.
  function toggleAction(action: CatalogueAction): void {
    const wasPicked = pickedById.has(action.id);
    onToggleAction(action);
    if (!wasPicked) setOpenActionId(action.id);
    else setOpenActionId((current) => (current === action.id ? null : current));
  }

  // Both groups render the same row; only which actions reach them differs.
  function renderAction(action: CatalogueAction): ReactElement {
    return (
      <ActionRow
        key={action.id}
        action={action}
        picked={pickedById.get(action.id)}
        opened={openActionId === action.id}
        onToggleOpen={() => toggleOpen(action.id)}
        onToggle={() => toggleAction(action)}
        onUpdate={(patch) => onUpdateAction(action.id, patch)}
        onToggleTag={(tagName) => onToggleActionTag(action.id, tagName)}
      />
    );
  }

  return (
    <>
      <Stack gap="lg" pb={BAR_CLEARANCE} ref={listRef}>
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

        {serviceActions.length > 0 && (
          <GroupedList title={t("addService.groupService")}>{serviceActions.map(renderAction)}</GroupedList>
        )}

        {replacementActions.length > 0 && (
          <GroupedList title={t("addService.groupReplacement")}>{replacementActions.map(renderAction)}</GroupedList>
        )}
      </Stack>

      {/* ---------- Pinned actions total and commit ---------- */}
      {/* What the category costs so far and the button that records it stay in sight while
          the list of actions scrolls - see docs/ui/pinned-action-bar.md. */}
      <Box
        data-fixed-footer
        left={PINNED_BAR_LEFT}
        style={{
          position: "fixed",
          right: 0,
          bottom: 0,
          // Rides above the software keyboard, which the webview does not resize for.
          transform: `translateY(-${keyboardOffset}px)`,
          display: "flex",
          justifyContent: "center",
          paddingBottom: "calc(0.75rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))",
          zIndex: 100,
          // Only the bar itself takes taps; the rest of this strip is page underneath.
          pointerEvents: "none",
        }}
      >
        {/* Fades page content out under the bar instead of cutting it off. */}
        <Box
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "8rem",
            background: "linear-gradient(to top, rgba(0, 0, 0, 0.90), transparent)",
            pointerEvents: "none",
            zIndex: -1,
          }}
        />
        <Group
          justify="space-between"
          wrap="nowrap"
          gap="sm"
          w={PINNED_BAR_WIDTH}
          px="md"
          py="sm"
          className="rounded-3xl border border-gray-720 bg-cards-600/30 backdrop-blur-md"
          style={{
            pointerEvents: "auto",
            boxShadow: "0 6px 20px color-mix(in srgb, var(--mantine-color-text-6) 15%, transparent)",
          }}
        >
          <Group gap={10} wrap="nowrap" style={{ minWidth: 0 }}>
            <Banknote size={28} color="var(--mantine-color-primary-5)" style={{ flexShrink: 0 }} />
            <Stack gap={0} style={{ minWidth: 0 }}>
              <Text fz={12} c="text.8" lh={1.3}>
                {t("addService.actionsCost")}:
              </Text>
              {/* A tally of the prices typed into the actions above, never an input of its
                  own: only the visit's total is overridable (ADR 0009). Written the way the
                  Summary writes its total, so one visit's money reads one way throughout. */}
              <Group gap={4} wrap="nowrap" align="center">
                <Text fw={700} fz={18} c="text.6" lh={1.2}>
                  {draftCost}
                </Text>
                <Text fw={700} fz={18} c="text.6" lh={1.2}>
                  {currencySymbol(user?.currency ?? null, i18n.language)}
                </Text>
              </Group>
            </Stack>
          </Group>
          <Button
            color="primary.6"
            radius="xl"
            leftSection={<Check size={18} />}
            disabled={!canCommit}
            styles={disabledButtonStyles}
            onClick={() => {
              onCommit();
            }}
            style={{ height: "2.75rem", flexShrink: 0 }}
          >
            {editing ? t("addService.saveChanges") : t("addService.saveAction")}
          </Button>
        </Group>
      </Box>
    </>
  );
}

// The box and the gap after it, so the expanded body lines up under the action's name.
const CHECKBOX_SIZE = 22;
const CHECKBOX_GAP = 12;
const BODY_INDENT = CHECKBOX_SIZE + CHECKBOX_GAP;

// A full tap target, pulled into the card's padding so the icon sits near the edge.
const CHEVRON_TARGET = 44;
const CHEVRON_PULL = -12;

const CHIP_HEIGHT = 32;

const NOTE_MAX_LENGTH = 500;

// Clear the fixed header the row would otherwise scroll underneath.
const SCROLL_MARGIN_TOP = "calc(4.5rem + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))";

// Labelled like the sections around it, so the expanded body reads as one quiet column.
const NEW_PART_STYLES = { ...autosizeInputStyles, label: { ...lightFieldLabel, marginBottom: 8 } };

// Mock G's chips: a filled tile with no frame, a notch smaller than the form's.
function pickerChipStyles(checked: boolean): ReturnType<typeof chipStyles> {
  const base = chipStyles(checked);
  return {
    ...base,
    label: {
      ...base.label,
      fontSize: 13,
      fontWeight: 500,
      minHeight: CHIP_HEIGHT,
      paddingLeft: 12,
      paddingRight: 12,
      borderColor: "transparent",
      backgroundColor: checked
        ? "color-mix(in srgb, var(--mantine-color-primary-6) 15%, var(--mantine-color-cards-6))"
        : "var(--color-surface-raised)",
      color: checked ? "var(--mantine-color-primary-6)" : "var(--mantine-color-text-6)",
    } as CSSProperties,
  };
}

// One candidate is no choice at all: ticking the Action already picked it
// (useAddServiceWizard.toggleAction). Since ADR 0022 gave every Component Type its own
// Replacement that is the ordinary case, and only a part the bike carries at both ends
// still needs choosing between.
function soleReplacementTarget(action: CatalogueAction): MountedComponent | null {
  return action.replace_action && action.components.length === 1 ? action.components[0] : null;
}

interface ActionRowProps {
  action: CatalogueAction;
  picked: PickedAction | undefined;
  opened: boolean;
  onToggleOpen: () => void;
  onToggle: () => void;
  onUpdate: (patch: Partial<PickedAction>) => void;
  onToggleTag: (tagName: string) => void;
}

// One catalogue Action: a tick, and everything the tick reveals. The chevron opens even
// an unticked action, so the tags can be read before the user commits to it.
export function ActionRow({
  action,
  picked,
  opened,
  onToggleOpen,
  onToggle,
  onUpdate,
  onToggleTag,
}: ActionRowProps): ReactElement {
  const { t } = useTranslation();
  const rowRef = useRef<HTMLDivElement>(null);
  const [tagDrawerOpen, setTagDrawerOpen] = useState(false);

  // Which tags are taken is the selection's own business now: the note is composed from
  // it only when the Service is saved - see ADR 0007.
  const taken = picked?.selectedTags ?? [];

  // A tag is live before the action is ticked: taking one ticks the action on the way through.
  function toggleTag(tagName: string): void {
    if (picked === undefined) onToggle();
    onToggleTag(tagName);
  }

  // A tag the user just made is one they meant to use. Creating a name the action already
  // carries answers with that tag, which may already be taken.
  function takeTag(tag: ActionTag): void {
    if (picked === undefined) onToggle();
    // The note is composed from the catalogue copy the ticked action carries, so a tag
    // made a moment ago has to join it or it would compose to nothing - see ADR 0007.
    // Not an edit of the block: sameAction compares only what the user types or taps.
    const known = picked?.tags ?? action.tags;
    if (!known.some((existing) => existing.tag === tag.tag)) {
      onUpdate({ tags: [...known, tag] });
    }
    if (!taken.includes(tag.tag)) onToggleTag(tag.tag);
  }

  // A tag that no longer exists cannot stay taken.
  function dropTag(tag: ActionTag): void {
    if (taken.includes(tag.tag)) onToggleTag(tag.tag);
  }

  // Scroll the opened row into view after layout, so its body is not left below the
  // fold - the same move the bike's component step makes.
  useEffect(() => {
    if (!opened) return;
    const element = rowRef.current;
    if (!element) return;

    const frame = window.requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [opened]);

  return (
    <Box ref={rowRef} style={{ scrollMarginTop: SCROLL_MARGIN_TOP }}>
      <ActionRowHeader
        action={action}
        picked={picked}
        opened={opened}
        onToggle={onToggle}
        onToggleOpen={onToggleOpen}
      />

      {opened && (
        <Stack gap={14} pl={BODY_INDENT} pt={2} pb={16}>
          <ComponentsField action={action} picked={picked} onToggle={onToggle} onUpdate={onUpdate} />
          <TagsField action={action} taken={taken} onToggleTag={toggleTag} onAdd={() => setTagDrawerOpen(true)} />
          {/* This note holds what the user wrote and nothing else; the tags join it on save. */}
          <Box>
            <Box style={{ borderTop: PANEL_HAIRLINE }}>
              <NoteRow
                label={t("addService.note")}
                value={picked?.customNote ?? ""}
                onChange={(note) => onUpdate({ customNote: note })}
                placeholder={t("addService.customNotePlaceholder")}
                maxLength={NOTE_MAX_LENGTH}
                disabled={picked === undefined}
                compact
              />
            </Box>
            <Box style={{ borderTop: PANEL_HAIRLINE }}>
              {/* An emptied field means no figure was recorded, not a price of zero. */}
              <PriceRow
                label={t("addService.partialCost")}
                value={picked?.partialCost ?? ""}
                onChange={(value) => onUpdate({ partialCost: value === "" ? null : Number(value) })}
                placeholder={t("addService.partialCostPlaceholder")}
                disabled={picked === undefined}
                compact
              />
            </Box>
          </Box>
        </Stack>
      )}

      <CustomTagDrawer
        opened={tagDrawerOpen}
        onClose={() => setTagDrawerOpen(false)}
        actionId={action.id}
        actionLabel={catalogueLabel(action.action_i18n_key, action.action_name, t)}
        tags={action.tags}
        onCreated={takeTag}
        onDeleted={dropTag}
      />
    </Box>
  );
}

// The tick and the name are one label, so a tap on either ticks; only the chevron opens.
function ActionRowHeader({
  action,
  picked,
  opened,
  onToggle,
  onToggleOpen,
}: {
  action: CatalogueAction;
  picked: PickedAction | undefined;
  opened: boolean;
  onToggle: () => void;
  onToggleOpen: () => void;
}): ReactElement {
  const { t } = useTranslation();

  // A closed but ticked action still says which parts it was performed on. A Replacement
  // naming its own part says it twice, so that one stays quiet.
  const summary =
    picked && !opened && soleReplacementTarget(action) === null
      ? action.components
          .filter((component) => picked.componentIds.includes(component.id))
          .map((component) => componentTypeLabel(component, t))
          .join(", ")
      : "";

  return (
    <Group gap={4} wrap="nowrap">
      <Box
        component="label"
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: LIST_ROW_HEIGHT,
          // Air for a ticked row whose parts add a second line.
          paddingBlock: 6,
          display: "flex",
          alignItems: "center",
          gap: CHECKBOX_GAP,
          cursor: "pointer",
        }}
      >
        <Checkbox
          checked={picked !== undefined}
          radius={6}
          iconColor="textDark.6"
          vars={() => ({
            root: {
              "--checkbox-size": `${String(CHECKBOX_SIZE)}px`,
              "--checkbox-color": "var(--mantine-color-primary-6)",
            },
          })}
          styles={{
            // Only the unticked box is painted: styles emits inline CSS, which has no
            // selectors, so an unconditional colour would cover the ticked fill.
            input:
              picked === undefined
                ? {
                    backgroundColor: "var(--mantine-color-cards-6)",
                    borderColor: "var(--mantine-color-cards-4)",
                    cursor: "pointer",
                  }
                : { cursor: "pointer" },
          }}
          onChange={onToggle}
        />
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Text fz={15} fw={500} c="text.6">
            {catalogueLabel(action.action_i18n_key, action.action_name, t)}
          </Text>
          {summary !== "" && (
            <Text fz={13} c="var(--color-text-dim)" lineClamp={1}>
              {summary}
            </Text>
          )}
        </Stack>
      </Box>
      <UnstyledButton
        aria-expanded={opened}
        aria-label={opened ? t("addService.hideActionDetails") : t("addService.showActionDetails")}
        onClick={onToggleOpen}
        w={CHEVRON_TARGET}
        h={CHEVRON_TARGET}
        mr={CHEVRON_PULL}
        c="text.8"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
      >
        {opened ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </UnstyledButton>
    </Group>
  );
}

// The parts this action is recorded against. Live before the action is ticked: picking one
// is how the user says the work happened, so it ticks the action on the way through.
function ComponentsField({
  action,
  picked,
  onToggle,
  onUpdate,
}: {
  action: CatalogueAction;
  picked: PickedAction | undefined;
  onToggle: () => void;
  onUpdate: (patch: Partial<PickedAction>) => void;
}): ReactElement | null {
  const { t } = useTranslation();
  const soleTarget = soleReplacementTarget(action);

  // Nothing to choose between: straight to describing the part going on.
  if (soleTarget !== null) {
    if (picked === undefined) return null;
    return <NewPartField picked={picked} componentId={soleTarget.id} onUpdate={onUpdate} />;
  }
  if (action.components.length === 0) return null;

  // An unticked action has none: nothing is picked on the user's behalf.
  const selectedIds = (picked?.componentIds ?? []).map(String);
  // A ticked action always names at least one part. With one candidate there is nothing
  // to choose, so its chip is shown ticked and locked rather than left to be unticked.
  const locked = picked !== undefined && action.components.length === 1;

  function renderChip(component: MountedComponent): ReactElement {
    const styles = pickerChipStyles(selectedIds.includes(String(component.id)));
    return (
      <Chip
        key={component.id}
        value={String(component.id)}
        radius="md"
        size="sm"
        color="primary.6"
        disabled={locked}
        // Inline colours already beat Mantine's disabled greys; only its cursor gets through.
        styles={locked ? { ...styles, label: { ...styles.label, cursor: "default" } } : styles}
        icon={false}
      >
        <Group gap={6} wrap="nowrap">
          {componentTypeIcon(component.component_type)}
          {shortComponentLabel(component, t)}
        </Group>
      </Chip>
    );
  }

  return (
    <Stack gap={8}>
      <Text style={lightFieldLabel}>{t("addService.componentsLabel")}</Text>
      <Chip.Group
        multiple
        value={selectedIds}
        onChange={(value) => {
          if (picked === undefined) onToggle();
          onUpdate({ componentIds: value.map(Number) });
        }}
      >
        {action.replace_action ? (
          <Stack gap="xs">
            {action.components.map((component) => (
              <Fragment key={component.id}>
                {renderChip(component)}
                {picked?.componentIds.includes(component.id) === true && (
                  // Indented so it reads as belonging to the chip above rather than to the list.
                  <Box pl="md">
                    <NewPartField picked={picked} componentId={component.id} onUpdate={onUpdate} />
                  </Box>
                )}
              </Fragment>
            ))}
          </Stack>
        ) : (
          <Group gap={8}>{action.components.map(renderChip)}</Group>
        )}
      </Chip.Group>
    </Stack>
  );
}

// The part going on, one per part coming off: two pads replaced are two new parts.
function NewPartField({
  picked,
  componentId,
  onUpdate,
}: {
  picked: PickedAction;
  componentId: number;
  onUpdate: (patch: Partial<PickedAction>) => void;
}): ReactElement {
  const { t } = useTranslation();

  return (
    <Textarea
      label={t("addService.newPart")}
      placeholder={t("addService.newPartPlaceholder")}
      value={picked.newDescriptions[componentId] ?? ""}
      autosize
      minRows={1}
      styles={NEW_PART_STYLES}
      onChange={(event) =>
        onUpdate({ newDescriptions: { ...picked.newDescriptions, [componentId]: event.currentTarget.value } })
      }
    />
  );
}

// What the action included, as chips taken or given back, and a way to name one of the user's own.
function TagsField({
  action,
  taken,
  onToggleTag,
  onAdd,
}: {
  action: CatalogueAction;
  taken: string[];
  onToggleTag: (tagName: string) => void;
  onAdd: () => void;
}): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack gap={8}>
      <Text style={lightFieldLabel}>{t("addService.tagsLabel")}</Text>
      <Group gap={8}>
        {action.tags.map((tag) => (
          <Chip
            key={tag.tag}
            checked={taken.includes(tag.tag)}
            icon={false}
            radius="md"
            size="sm"
            color="primary.6"
            styles={pickerChipStyles(taken.includes(tag.tag))}
            onChange={() => onToggleTag(tag.tag)}
          >
            {catalogueLabel(tag.i18n_key, tag.tag, t)}
          </Chip>
        ))}
        <UnstyledButton
          aria-label={t("addService.addCustomTag")}
          onClick={onAdd}
          h={CHIP_HEIGHT}
          px={10}
          c="text.8"
          style={{ display: "flex", alignItems: "center", gap: 5 }}
        >
          <Plus size={14} />
          <Text component="span" fz={13} fw={500} c="text.8">
            {t("addService.addTag")}
          </Text>
        </UnstyledButton>
      </Group>
    </Stack>
  );
}
