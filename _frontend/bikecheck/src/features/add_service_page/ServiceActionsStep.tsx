// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { Fragment, useEffect, useRef, useState, type ReactElement } from "react";
import {
  ActionIcon,
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
import { AlertTriangle, Banknote, Check, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useHeaderStore } from "@/store/store";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import { useScrollIntoViewOnFocus } from "@/hooks/useScrollIntoViewOnFocus";
import { useCategoryActions } from "@/features/service/service.queries";
import { useCurrentUser } from "@/features/users/users.queries";
import { currencySymbol } from "@/utils/money";
import type { ActionTag, CatalogueAction, MountedComponent } from "@/features/service/service.types";
import {
  autosizeInputStyles,
  chipStyles,
  disabledButtonStyles,
  fieldLabel,
  inputStyles,
} from "@/features/add_bike_page/formStyles";
import { catalogueLabel, componentTypeLabel, shortComponentLabel } from "@/features/service/serviceLabels";
import { categoryIcon } from "@/features/service/categoryIcon";
import { CustomTagDrawer } from "./CustomTagDrawer";
import type { DraftBlock, PickedAction } from "./serviceWizard.types";
import { bikecheckIconType } from "@/assets/icons/bikecheck";
import { RefreshCcw } from "lucide-react";
const BikecheckIcon = bikecheckIconType("Bikecheck")!;

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
  // A price or a note near the end of the list would otherwise be focused behind the bar.
  const listRef = useScrollIntoViewOnFocus<HTMLDivElement>("[data-fixed-footer]");
  // One action open at a time, as on the bike's component step.
  const [openActionId, setOpenActionId] = useState<number | null>(null);
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
  // A heading earns its place only against another one: a category holding just one kind
  // reads as the flat list it has always been.
  const showGroupHeadings = true;
  // Editing an existing block may end with every action removed, which removes the block.
  const editing = draft !== null && draft.editingIndex !== null;

  function toggleOpen(actionId: number): void {
    setOpenActionId((current) => (current === actionId ? null : actionId));
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
        onToggle={() => {
          onToggleAction(action);
          setOpenActionId(pickedById.has(action.id) ? null : action.id);
        }}
        onUpdate={(patch) => onUpdateAction(action.id, patch)}
        onToggleTag={(tagName) => onToggleActionTag(action.id, tagName)}
      />
    );
  }

  return (
    <>
      <Stack gap="md" pb={BAR_CLEARANCE} ref={listRef}>
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
          <Stack gap="md">
            <Group gap={6} wrap="nowrap" align="center">
              <BikecheckIcon size={18} color="var(--mantine-color-text-6)" />
              {showGroupHeadings && (
                <Text fz={15} c="text.6" ff="Inter" fw={500}>
                  {t("addService.groupService")}
                </Text>
              )}
            </Group>
            {serviceActions.map(renderAction)}
          </Stack>
        )}

        {replacementActions.length > 0 && (
          <Stack gap="md" mt="md">
            <Group gap={6} wrap="nowrap" align="center">
              <RefreshCcw size={18} color="var(--mantine-color-text-6)" />
              {showGroupHeadings && (
                <Text fz={15} c="text.6" ff="Inter" fw={800}>
                  {t("addService.groupReplacement")}
                </Text>
              )}
            </Group>
            {replacementActions.map(renderAction)}
          </Stack>
        )}
      </Stack>

      {/* ---------- Pinned actions total and commit ---------- */}
      {/* What the category costs so far and the button that records it stay in sight while
          the list of actions scrolls - see docs/ui/pinned-action-bar.md. */}
      <Box
        data-fixed-footer
        style={{
          position: "fixed",
          left: 0,
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
          w="92%"
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

// One catalogue Action: a tick, and everything the tick reveals. The header opens even
// an unticked action, so the tags can be read before the user commits to it.
function ActionRow({
  action,
  picked,
  opened,
  onToggleOpen,
  onToggle,
  onUpdate,
  onToggleTag,
}: {
  action: CatalogueAction;
  picked: PickedAction | undefined;
  opened: boolean;
  onToggleOpen: () => void;
  onToggle: () => void;
  onUpdate: (patch: Partial<PickedAction>) => void;
  onToggleTag: (tagName: string) => void;
}): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: user } = useCurrentUser();
  const cardRef = useRef<HTMLDivElement>(null);
  const [tagDrawerOpen, setTagDrawerOpen] = useState(false);

  // Which tags are taken is the selection's own business now: the note is composed from
  // it only when the Service is saved - see ADR 0007.
  const taken = picked?.selectedTags ?? [];

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

  // Scroll the opened card into view after layout, so its body is not left below the
  // fold - the same move the bike's component step makes.
  useEffect(() => {
    if (!opened) return;
    const element = cardRef.current;
    if (!element) return;

    const frame = window.requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [opened]);

  // The parts this action is recorded against, which the chips and their group both read.
  // An unticked action has none: nothing is picked on the user's behalf.
  const selectedComponentIds = (picked?.componentIds ?? []).map(String);

  // The same chip whichever way the parts are laid out; only the arrangement differs.
  function renderComponentChip(component: MountedComponent): ReactElement {
    return (
      <Chip
        key={component.id}
        value={String(component.id)}
        radius="xl"
        size="sm"
        color="primary.6"
        styles={chipStyles(selectedComponentIds.includes(String(component.id)))}
        icon={false}
      >
        {shortComponentLabel(component, t)}
      </Chip>
    );
  }

  // A closed but ticked action still says which parts it was performed on.
  const summary =
    picked && !opened
      ? action.components
          .filter((component) => picked.componentIds.includes(component.id))
          .map((component) => componentTypeLabel(component, t))
          .join(", ")
      : "";

  return (
    <Paper
      ref={cardRef}
      radius="lg"
      style={{
        // Clear the fixed header the card would otherwise scroll underneath.
        scrollMarginTop: "calc(4.5rem + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))",
        // Colour, glow and inner edge all live in this one object: `bg` would emit the
        // `background` shorthand and wipe the gradient - see docs/ui/card-surface.md.
        backgroundColor: "var(--mantine-color-cards-6)",
        backgroundImage:
          "radial-gradient(90% 120% at 0% 0%, color-mix(in srgb, var(--mantine-color-primary-6) 7%, transparent) 0%, transparent 45%)",
        border:
          opened && picked
            ? "1px solid var(--mantine-color-primary-8)"
            : picked
              ? "1px solid var(--mantine-color-primary-8)"
              : "1px solid var(--mantine-color-cards-5)",
        boxShadow:
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.35), 0 8px 16px -6px rgba(0, 0, 0, 0.5)",
      }}
    >
      <Group gap="sm" wrap="nowrap" p="md" align="flex-start" justify="center">
        <Checkbox
          checked={picked !== undefined}
          vars={() => ({
            root: {
              "--checkbox-color": "var(--mantine-color-primary-6)",
            },
          })}
          styles={{
            // Only the unticked box is painted: styles emits inline CSS, which has no
            // selectors, so a "&:checked" key here would be dropped and an unconditional
            // colour would cover the fill --checkbox-color draws once it is ticked.
            input:
              picked === undefined
                ? {
                    backgroundColor: "var(--mantine-color-cards-6)",
                    borderColor: "var(--mantine-color-cards-4)",
                  }
                : undefined,
          }}
          aria-label={catalogueLabel(action.action_i18n_key, action.action_name, t)}
          onChange={() => {
            onToggle();
          }}
        />
        {/* Maintenance carries the mark; a Replacement does not. */}
        {/* {!action.replace_action && <BikecheckIcon size={20} color="var(--mantine-color-text-6)" />}
        {action.replace_action && <RefreshCcw size={20} color="var(--mantine-color-text-6)" />} */}
        <UnstyledButton
          onClick={() => {
            onToggleOpen();
          }}
          aria-expanded={opened}
          style={{ flex: 1, minWidth: 0 }}
        >
          <Group justify="space-between" wrap="nowrap" gap="sm" align="flex-start">
            <Stack gap={2} style={{ minWidth: 0 }}>
              {/* -------- Action name --------*/}
              <Text fw={700} fz={15} c="text.6">
                {catalogueLabel(action.action_i18n_key, action.action_name, t)}
              </Text>
              {summary !== "" && (
                <Text fz={13} c="var(--color-text-dim)" lineClamp={1}>
                  {summary}
                </Text>
              )}
            </Stack>
            <Box c={opened ? "primary.6" : "var(--color-text-dim)"} style={{ flexShrink: 0, display: "flex" }}>
              {opened ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
            </Box>
          </Group>
        </UnstyledButton>
      </Group>

      {opened && (
        <Stack gap="sm" px="md" pb="md">
          {/* The parts are live before the action is ticked: picking one is how the user
              says the work happened, so it ticks the action on the way through. */}
          {action.components.length > 0 && (
            <Stack gap={6}>
              <Text style={fieldLabel}>{t("addService.componentsLabel")}</Text>
              <Chip.Group
                multiple
                value={selectedComponentIds}
                onChange={(value) => {
                  if (picked === undefined) onToggle();
                  onUpdate({ componentIds: value.map(Number) });
                }}
              >
                {action.replace_action ? (
                  <Stack gap="xs">
                    {action.components.map((component) => (
                      <Fragment key={component.id}>
                        {renderComponentChip(component)}
                        {picked?.componentIds.includes(component.id) === true && (
                          // Indented so it reads as belonging to the chip above rather than
                          // to the list as a whole.
                          <Box pl="md">
                            <TextInput
                              label={t("addService.newPart")}
                              placeholder={t("addService.newPartPlaceholder")}
                              value={picked.newDescriptions[component.id] ?? ""}
                              styles={inputStyles}
                              onChange={(event) =>
                                onUpdate({
                                  newDescriptions: {
                                    ...picked.newDescriptions,
                                    [component.id]: event.currentTarget.value,
                                  },
                                })
                              }
                            />
                          </Box>
                        )}
                      </Fragment>
                    ))}
                  </Stack>
                ) : (
                  <Group gap="xs">{action.components.map(renderComponentChip)}</Group>
                )}
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

          {/* ------- A tag chip -------*/}
          <Stack gap={6}>
            <Text style={fieldLabel}>{t("addService.tagsLabel")}</Text>
            <Group gap="xs">
              {action.tags.map((tag) => (
                <Chip
                  key={tag.tag}
                  checked={taken.includes(tag.tag)}
                  icon={false}
                  radius="xl"
                  size="sm"
                  color="primary.6"
                  styles={chipStyles(taken.includes(tag.tag))}
                  onChange={() => {
                    if (picked === undefined) onToggle();
                    onToggleTag(tag.tag);
                  }}
                >
                  {catalogueLabel(tag.i18n_key, tag.tag, t)}
                </Chip>
              ))}
              <ActionIcon
                variant="subtle"
                radius="xl"
                size="auto"
                styles={{
                  root: {
                    border: "1px solid var(--mantine-color-cards-5)",
                  },
                }}
                aria-label={t("addService.addCustomTag")}
                onClick={() => {
                  setTagDrawerOpen(true);
                }}
              >
                <Group gap={4} wrap="nowrap" align="center" pl="xs" pr="sm" py={4}>
                  <Plus size={17} color="var(--mantine-color-text-7)" />
                  <Text fz={13} c="var(--mantine-color-text-7)" fw={500}>
                    {t("addService.addCustomTag")}
                  </Text>
                </Group>
              </ActionIcon>
            </Group>
          </Stack>

          {/* This field holds what the user wrote and nothing else. The tags join it on
              the way to the Service, which is where the two become one note. */}
          <Textarea
            placeholder={t("addService.customNotePlaceholder")}
            value={picked?.customNote ?? ""}
            disabled={picked === undefined}
            autosize
            minRows={1}
            maxLength={500}
            styles={autosizeInputStyles}
            onChange={(event) => onUpdate({ customNote: event.currentTarget.value })}
          />

          {picked && (
            <>
              <NumberInput
                // label={t("addService.partialCost")}
                placeholder={t("addService.partialCostPlaceholder")}
                value={picked.partialCost ?? ""}
                min={0}
                hideControls
                styles={inputStyles}
                // Decoration rather than part of the value, so an emptied field is still
                // empty and still means "no figure recorded" rather than a price of zero.
                // Sized explicitly: Mantine derives a section's width from the input's
                // height, which is too narrow for "CZK".
                rightSectionWidth={54}
                rightSectionPointerEvents="none"
                rightSection={
                  <Text fz={13} c="var(--mantine-color-text-2)">
                    {currencySymbol(user?.currency ?? null, i18n.language)}
                  </Text>
                }
                onChange={(value) => onUpdate({ partialCost: value === "" ? null : Number(value) })}
              />
            </>
          )}
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
    </Paper>
  );
}
