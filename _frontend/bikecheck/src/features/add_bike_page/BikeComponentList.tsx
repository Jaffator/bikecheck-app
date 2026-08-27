import { useEffect, useRef, type ReactElement } from "react";
import { Box, Group, Loader, Paper, Stack, Text, Textarea, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Ban, ChevronUp, Merge, Pencil, Plus, SearchX, Split, Wrench, CircleCheckBig } from "lucide-react";
import { IoCloudOffline } from "react-icons/io5";
import { useScrollIntoViewOnFocus } from "@/hooks/useScrollIntoViewOnFocus";
import { groupIcon } from "@/assets/icons/svg_icons/groups";
import { componentIcon } from "@/assets/icons/svg_icons/components";
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
  components: AssembleBikeComponent[] | undefined;
  entries: ComponentEntries;
  onChangeDescription: (componentTypeId: number, position: ComponentPosition, description: string) => void;
  splitComponents: SplitComponents;
  onToggleSplit: (componentTypeId: number) => void;
  disabledComponents: DisabledComponents;
  onToggleDisabled: (componentTypeId: number) => void;
  openGroupId: number | null;
  onToggleGroup: (groupId: number) => void;
  isLoading: boolean;
  isError: boolean;
}

// Use the fallback name for user-created data without a translation key.
function translatedName(i18nKey: string | null, fallback: string, translate: (key: string) => string): string {
  return i18nKey ? translate(i18nKey) : fallback;
}

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

function SplitToggle({ split, label, onToggle }: { split: boolean; label: string; onToggle: () => void }): ReactElement {
  return (
    <UnstyledButton
      onClick={() => {
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

function AbsentToggle({ absent, label, onToggle }: { absent: boolean; label: string; onToggle: () => void }): ReactElement {
  return (
    <UnstyledButton
      onClick={() => {
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
        backgroundColor: absent
          ? "color-mix(in srgb, var(--mantine-color-red-4) 15%, transparent)"
          : "color-mix(in srgb, var(--mantine-color-green-8) 15%, transparent)",
        color: absent ? "var(--mantine-color-red-4)" : "var(--mantine-color-green-9)",
        fontSize: "0.7rem",
      }}
    >
      {absent ? <Ban size={12} /> : <CircleCheckBig size={12} />}
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
  // Keep focused fields above the fixed footer and keyboard.
  const listRef = useScrollIntoViewOnFocus<HTMLDivElement>("[data-fixed-footer]");
  const openGroupRef = useRef<HTMLDivElement>(null);

  // Scroll the expanded group header into view after layout.
  useEffect(() => {
    if (openGroupId === null) return;
    const element = openGroupRef.current;
    if (!element) return;

    const frame = window.requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [openGroupId]);

  if (isLoading) {
    return <StatusPanel mark={<Loader color="primary.6" />} body={t("addBike.componentsLoading")} />;
  }

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

  const positionLabels: Record<(typeof SIDED_POSITIONS)[number], string> = {
    front: t("addBike.positionFront"),
    rear: t("addBike.positionRear"),
  };

  return (
    <Stack gap="sm" ref={listRef}>
      {grouped.map(({ group, components: groupComponentTypes }) => {
        const isOpen = openGroupId === group.id;
        const configured = countConfigured(entries, groupComponentTypes, splitComponents, disabledComponents);
        const fields = countFields(groupComponentTypes, splitComponents, disabledComponents);
        const groupName = translatedName(group.i18n_key, group.group_name, t);
        const complete = fields === 0 || configured === fields;
        const highlighted = isOpen || complete;
        const GroupIcon = groupIcon(group.group_name);
        const summary = groupComponentTypes
          .slice(0, 3)
          .map((component) => translatedName(component.component_i18n_key, component.component_name, t))
          .join(", ");

        return (
          <Paper
            key={group.id}
            ref={isOpen ? openGroupRef : undefined}
            bg="cards.6"
            radius="md"
            style={{
              border: isOpen
                ? "1px solid var(--mantine-color-primary-9)"
                : "1px solid var(--mantine-color-other-borderSubtle)",
              scrollMarginTop: "calc(4.5rem + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))",
            }}
          >
            <UnstyledButton
              onClick={() => {
                onToggleGroup(group.id);
              }}
              aria-expanded={isOpen}
              style={{ display: "block", width: "100%", padding: "1rem" }}
            >
              <Group justify="space-between" wrap="nowrap" gap="sm">
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <GroupMark highlighted={highlighted}>
                    {GroupIcon ? (
                      <GroupIcon
                        width={26}
                        height={26}
                        color={highlighted ? "var(--mantine-color-primary-6)" : "var(--mantine-color-text-8)"}
                      />
                    ) : (
                      <Wrench
                        size={18}
                        color={highlighted ? "var(--mantine-color-primary-6)" : "var(--mantine-color-text-8)"}
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
                      <Text size="sm" c={complete ? "primary.6" : "text.8"}>
                        {t("addBike.partsConfigured", { count: configured, total: fields })}
                      </Text>
                    ) : (
                      <Text size="sm" c="text.8" truncate>
                        {summary}
                      </Text>
                    )}
                  </Stack>
                </Group>

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
                        ? "1px solid var(--mantine-color-cards-3)"
                        : "1px solid var(--mantine-color-other-borderSolid)",
                    color: isOpen || configured > 0 ? "var(--mantine-color-cards-3)" : "var(--mantine-color-text-8)",
                  }}
                >
                  {isOpen ? <ChevronUp size={16} /> : configured > 0 ? <Pencil size={14} /> : <Plus size={16} />}
                </Box>
              </Group>
            </UnstyledButton>

            {isOpen && (
              <Stack gap="md" px="md" pb="md">
                {groupComponentTypes.map((component) => {
                  const typeId = componentTypeId(component);
                  const componentName = translatedName(component.component_i18n_key, component.component_name, t);

                  const split = isSplit(component, splitComponents);
                  const disabled = disabledComponents.has(typeId);
                  const ComponentIcon = componentIcon(component.component_name);

                  return (
                    <Stack key={typeId} gap={6}>
                      <Group justify="space-between" wrap="nowrap" gap="xs">
                        <Group gap="xs" wrap="nowrap">
                          {ComponentIcon && (
                            <ComponentIcon
                              width={18}
                              height={18}
                              style={{ flexShrink: 0 }}
                              color={disabled ? "var(--mantine-color-text-9)" : "var(--mantine-color-primary-6)"}
                            />
                          )}
                          <Text
                            size="md"
                            fw={600}
                            c={disabled ? "text.9" : "text.7"}
                            td={disabled ? "line-through" : undefined}
                          >
                            {componentName}
                          </Text>
                        </Group>
                        <Group gap="xs" wrap="nowrap">
                          {component.has_position && !disabled && (
                            <SplitToggle
                              split={split}
                              label={split ? t("addBike.mergeSides") : t("addBike.splitSides")}
                              onToggle={() => onToggleSplit(typeId)}
                            />
                          )}
                          <AbsentToggle
                            absent={disabled}
                            label={disabled ? t("addBike.partAbsentUndo") : t("addBike.partAbsent")}
                            onToggle={() => onToggleDisabled(typeId)}
                          />
                        </Group>
                      </Group>
                      {!disabled &&
                        positionsOf(component, splitComponents).map((position) => (
                          <Stack key={position} gap={4}>
                            {position !== "none" && (
                              <Text size="xs" c="text.8">
                                {positionLabels[position]}
                              </Text>
                            )}
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
