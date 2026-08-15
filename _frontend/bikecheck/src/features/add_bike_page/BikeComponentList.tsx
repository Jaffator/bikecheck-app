// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { type ReactElement } from "react";
import { Box, Group, Loader, Paper, Stack, Text, Textarea, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Ban, ChevronUp, Merge, Pencil, Plus, SearchX, Split, Undo2, Wrench } from "lucide-react";
import { IoCloudOffline } from "react-icons/io5";
import { tapFeedback } from "@/utils/haptics";
import { groupIcon } from "@/assets/icons/svg_icons/groups";
import type { AssembleBikeComponent, ComponentGroup } from "../components/components.types";
import { autosizeInputStyles } from "./formStyles";
import {
  componentTypeId,
  countConfigured,
  countFields,
  groupComponents,
  isSplit,
  positionsOf,
  readEntry,
  SIDED_POSITIONS,
  type ComponentEntries,
  type ComponentPosition,
  type DisabledComponents,
  type SplitComponents,
} from "./bikeComponents.types";

interface BikeComponentListProps {
  groups: ComponentGroup[] | undefined;
  // Every trackable component type, already prefilled from the scrape.
  components: AssembleBikeComponent[] | undefined;
  entries: ComponentEntries;
  onChangeDescription: (componentTypeId: number, position: ComponentPosition, description: string) => void;
  // Sided parts the user asked to describe one end at a time.
  splitComponents: SplitComponents;
  onToggleSplit: (componentTypeId: number) => void;
  // Parts the user said his bike does not have; nothing is saved for them.
  disabledComponents: DisabledComponents;
  onToggleDisabled: (componentTypeId: number) => void;
  // Only one group is open at a time — a phone cannot show two expanded ones.
  openGroupId: number | null;
  onToggleGroup: (groupId: number) => void;
  isLoading: boolean;
  isError: boolean;
}

// Seeded data carries a translation key; a group or type the user created
// himself has none, and then its own name is the label.
function translatedName(i18nKey: string | null, fallback: string, translate: (key: string) => string): string {
  return i18nKey ? translate(i18nKey) : fallback;
}

// Loading, failure and "nothing found" all replace the list with the same
// centred panel — only the mark and the wording differ.
function StatusPanel({
  mark,
  title,
  body,
  titleColor,
}: {
  mark: ReactElement;
  title?: string;
  body: string;
  titleColor?: string;
}): ReactElement {
  return (
    <Paper bg="cards.6" p="xl" radius="md" py={40}>
      <Stack gap="md" align="center">
        {mark}
        {title && (
          <Text fw={700} size="lg" c={titleColor} ta="center">
            {title}
          </Text>
        )}
        <Text size="sm" c="text.7" ta="center">
          {body}
        </Text>
      </Stack>
    </Paper>
  );
}

// The round mark on the left of every group row. It carries the open/configured
// state, so the row reads at a glance without opening it.
function GroupMark({ highlighted, children }: { highlighted: boolean; children: ReactElement }): ReactElement {
  return (
    <Box
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "2.5rem",
        height: "2.5rem",
        flexShrink: 0,
        borderRadius: "50%",
        backgroundColor: highlighted
          ? "color-mix(in srgb, var(--mantine-color-primary-6) 15%, transparent)"
          : "var(--mantine-color-cards-5)",
      }}
    >
      {children}
    </Box>
  );
}

// Splits a paired part into a front and a rear field, or folds the two back
// into one. Sits next to the part's name, since it changes what that part asks
// for rather than what it is.
function SplitToggle({ split, label, onToggle }: { split: boolean; label: string; onToggle: () => void }): ReactElement {
  return (
    <UnstyledButton
      onClick={() => {
        tapFeedback();
        onToggle();
      }}
      aria-pressed={split}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.25rem",
        flexShrink: 0,
        padding: "0.25rem 0.5rem",
        borderRadius: "var(--mantine-radius-sm)",
        backgroundColor: split
          ? "color-mix(in srgb, var(--mantine-color-primary-6) 15%, transparent)"
          : "var(--mantine-color-cards-5)",
        color: split ? "var(--mantine-color-primary-6)" : "var(--mantine-color-text-8)",
        fontSize: "0.7rem",
      }}
    >
      {split ? <Merge size={12} /> : <Split size={12} />}
      {label}
    </UnstyledButton>
  );
}

// Says the bike does not carry this part at all. Without it an essential part
// would be saved blank, so a singlespeed would end up tracking a derailleur.
function AbsentToggle({
  absent,
  label,
  onToggle,
}: {
  absent: boolean;
  label: string;
  onToggle: () => void;
}): ReactElement {
  return (
    <UnstyledButton
      onClick={() => {
        tapFeedback();
        onToggle();
      }}
      aria-pressed={absent}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.25rem",
        flexShrink: 0,
        padding: "0.25rem 0.5rem",
        borderRadius: "var(--mantine-radius-sm)",
        backgroundColor: absent ? "color-mix(in srgb, var(--mantine-color-red-4) 15%, transparent)" : "transparent",
        color: absent ? "var(--mantine-color-red-4)" : "var(--mantine-color-text-9)",
        fontSize: "0.7rem",
      }}
    >
      {absent ? <Undo2 size={12} /> : <Ban size={12} />}
      {label}
    </UnstyledButton>
  );
}

export function BikeComponentList({
  groups,
  components,
  entries,
  onChangeDescription,
  splitComponents,
  onToggleSplit,
  disabledComponents,
  onToggleDisabled,
  openGroupId,
  onToggleGroup,
  isLoading,
  isError,
}: BikeComponentListProps): ReactElement {
  const { t } = useTranslation();

  if (isLoading) {
    return <StatusPanel mark={<Loader color="primary.6" />} body={t("addBike.componentsLoading")} />;
  }

  // Scraping a detail page fails the same way the search does, and the user has
  // the same way out — carry on and add the parts by hand later.
  if (isError) {
    return (
      <StatusPanel
        mark={<IoCloudOffline size={35} color="var(--mantine-color-red-4)" />}
        title={t("addBike.componentsFailedTitle")}
        titleColor="red.4"
        body={t("addBike.componentsFailedBody")}
      />
    );
  }

  const grouped = groupComponents(groups ?? [], components ?? []);

  if (grouped.length === 0) {
    return (
      <StatusPanel
        mark={<SearchX size={35} color="var(--mantine-color-text-8)" />}
        title={t("addBike.componentsEmptyTitle")}
        titleColor="text.6"
        body={t("addBike.componentsEmptyBody")}
      />
    );
  }

  // Only the two sides are ever labelled — an unsided part has a single field
  // and the component name above it already says what it is.
  const positionLabels: Record<(typeof SIDED_POSITIONS)[number], string> = {
    front: t("addBike.positionFront"),
    rear: t("addBike.positionRear"),
  };

  return (
    <Stack gap="sm">
      {grouped.map(({ group, components: groupComponentTypes }) => {
        const isOpen = openGroupId === group.id;
        const configured = countConfigured(entries, groupComponentTypes, splitComponents, disabledComponents);
        const fields = countFields(groupComponentTypes, splitComponents, disabledComponents);
        const groupName = translatedName(group.i18n_key, group.group_name, t);
        // Addressed by the seeded English name, not the translated one the row
        // displays. A group without an icon of its own falls back to the tool.
        const GroupIcon = groupIcon(group.group_name);
        // Closed rows preview what the group holds; the count replaces it once
        // the user has described something, since that is the news.
        const summary = groupComponentTypes
          .slice(0, 3)
          .map((component) => translatedName(component.component_i18n_key, component.component_name, t))
          .join(", ");

        return (
          <Paper
            key={group.id}
            bg="cards.6"
            radius="md"
            style={{
              border: isOpen
                ? "1px solid var(--mantine-color-primary-6)"
                : "1px solid var(--mantine-color-other-borderSubtle)",
            }}
          >
            {/* ----------- Group header ----------- */}
            {/* The whole row is the tap target, so a thumb does not have to
                find the small circle on the right. */}
            <UnstyledButton
              onClick={() => {
                tapFeedback();
                onToggleGroup(group.id);
              }}
              aria-expanded={isOpen}
              style={{ display: "block", width: "100%", padding: "1rem" }}
            >
              <Group justify="space-between" wrap="nowrap" gap="sm">
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <GroupMark highlighted={isOpen || configured > 0}>
                    {GroupIcon ? (
                      <GroupIcon
                        width={26}
                        height={26}
                        color={isOpen || configured > 0 ? "var(--mantine-color-primary-6)" : "var(--mantine-color-text-8)"}
                      />
                    ) : (
                      <Wrench
                        size={18}
                        color={isOpen || configured > 0 ? "var(--mantine-color-primary-6)" : "var(--mantine-color-text-8)"}
                      />
                    )}
                  </GroupMark>
                  <Stack gap={2} style={{ minWidth: 0 }}>
                    <Text fw={700} size="md" c="text.6">
                      {groupName}
                    </Text>
                    {isOpen ? (
                      <Text size="sm" c="primary.6">
                        {t("addBike.editingComponents")}
                      </Text>
                    ) : configured > 0 ? (
                      // A group with every part described is done, and says so
                      // in the accent colour; a partial count stays quiet.
                      <Text size="sm" c={configured === fields ? "primary.6" : "text.8"}>
                        {t("addBike.partsConfigured", { count: configured, total: fields })}
                      </Text>
                    ) : (
                      <Text size="sm" c="text.8" truncate>
                        {summary}
                      </Text>
                    )}
                  </Stack>
                </Group>

                {/* Open, already-filled and untouched groups each get their own
                    mark, so the state is readable without expanding. */}
                <Box
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "2rem",
                    height: "2rem",
                    flexShrink: 0,
                    borderRadius: "50%",
                    border:
                      isOpen || configured > 0
                        ? "1px solid var(--mantine-color-primary-6)"
                        : "1px solid var(--mantine-color-other-borderSolid)",
                    color: isOpen || configured > 0 ? "var(--mantine-color-primary-6)" : "var(--mantine-color-text-8)",
                  }}
                >
                  {isOpen ? <ChevronUp size={16} /> : configured > 0 ? <Pencil size={14} /> : <Plus size={16} />}
                </Box>
              </Group>
            </UnstyledButton>

            {/* ----------- Group body ----------- */}
            {isOpen && (
              <Stack gap="md" px="md" pb="md">
                {groupComponentTypes.map((component) => {
                  const typeId = componentTypeId(component);
                  const componentName = translatedName(component.component_i18n_key, component.component_name, t);

                  const split = isSplit(component, splitComponents);
                  const disabled = disabledComponents.has(typeId);

                  return (
                    <Stack key={typeId} gap={6}>
                      <Group justify="space-between" wrap="nowrap" gap="xs">
                        <Text size="sm" fw={600} c={disabled ? "text.9" : "text.7"} td={disabled ? "line-through" : undefined}>
                          {componentName}
                        </Text>
                        <Group gap="xs" wrap="nowrap">
                          {/* A part that comes in pairs is usually the same at
                              both ends, so it starts as one field and only splits
                              when the user says the sides differ. */}
                          {component.has_position && !disabled && (
                            <SplitToggle
                              split={split}
                              label={split ? t("addBike.mergeSides") : t("addBike.splitSides")}
                              onToggle={() => onToggleSplit(typeId)}
                            />
                          )}
                          {/* Not every bike carries every part, and an essential
                              one would otherwise be saved blank. */}
                          <AbsentToggle
                            absent={disabled}
                            label={disabled ? t("addBike.partAbsentUndo") : t("addBike.partAbsent")}
                            onToggle={() => onToggleDisabled(typeId)}
                          />
                        </Group>
                      </Group>
                      {/* The fields go away with the part: there is nothing to
                          describe about a part the bike does not have. */}
                      {!disabled &&
                        positionsOf(component, splitComponents).map((position) => (
                          <Stack key={position} gap={4}>
                            {position !== "none" && (
                              <Text size="xs" c="text.8">
                                {positionLabels[position]}
                              </Text>
                            )}
                            {/* Scraped descriptions are long ("Campagnolo Bora
                                Ultra WTO, Axle dimension…"), so the field wraps
                                and grows instead of hiding the tail. */}
                            <Textarea
                              autosize
                              minRows={1}
                              placeholder={t("addBike.componentPlaceholder")}
                              value={readEntry(entries, typeId, position).description}
                              onChange={(event) => onChangeDescription(typeId, position, event.currentTarget.value)}
                              radius="sm"
                              styles={autosizeInputStyles}
                            />
                          </Stack>
                        ))}
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </Paper>
        );
      })}
    </Stack>
  );
}
