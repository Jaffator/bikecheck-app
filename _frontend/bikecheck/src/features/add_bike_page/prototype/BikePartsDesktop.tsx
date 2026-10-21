// PROTOTYPE (proto/desktop-wizards): step 3 on desktop - groups on the left, the open group's parts as rows.
import { useState, type CSSProperties, type ReactElement } from "react";
import { Box, Group, Paper, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Ban, CircleCheckBig, Merge, Split } from "lucide-react";
import type { AssembleBikeComponent } from "@/features/components/components.types";
import { categoryIcon } from "@/features/service/ui/categoryIcon";
import {
  componentTypeId,
  countConfigured,
  countFields,
  groupComponents,
  isSplit,
  positionsOf,
  readEntry,
  type ComponentPosition,
} from "../bikeComponents.types";
import { inputStyles } from "../formStyles";
import { LookupProgress } from "../LookupProgress";
import type { AddBikeWizard } from "../useAddBikeWizard";
import { COPY, cardSurface } from "./bikeProto";

// Room for "Přední/zadní" and "Mám" side by side, icons included.
const TOGGLES_WIDTH = "13rem";

// Sits beside a 14px label in a nav row.
const NAV_ICON_SIZE = 20;

const TOGGLE_ICON_SIZE = 14;

function translatedName(i18nKey: string | null, fallback: string, translate: (key: string) => string): string {
  return i18nKey ? translate(i18nKey) : fallback;
}

// Desktop-sized twin of the mobile row chips, so both platforms read the same.
function toggleStyle(background: string, color: string): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
    height: "2.4rem",
    padding: "0 0.75rem",
    borderRadius: "var(--mantine-radius-md)",
    fontSize: 13,
    fontWeight: 600,
    backgroundColor: background,
    color,
  };
}

function SplitToggle({ split, label, onToggle }: { split: boolean; label: string; onToggle: () => void }): ReactElement {
  return (
    <UnstyledButton
      aria-pressed={split}
      onClick={onToggle}
      style={toggleStyle("var(--mantine-color-cards-5)", "var(--mantine-color-text-8)")}
    >
      {split ? <Split size={TOGGLE_ICON_SIZE} /> : <Merge size={TOGGLE_ICON_SIZE} />}
      {label}
    </UnstyledButton>
  );
}

function AbsentToggle({ absent, label, onToggle }: { absent: boolean; label: string; onToggle: () => void }): ReactElement {
  return (
    <UnstyledButton
      aria-pressed={absent}
      onClick={onToggle}
      style={
        absent
          ? toggleStyle("color-mix(in srgb, var(--mantine-color-red-4) 15%, transparent)", "var(--mantine-color-red-4)")
          : toggleStyle("color-mix(in srgb, var(--mantine-color-green-8) 15%, transparent)", "var(--mantine-color-green-9)")
      }
    >
      {absent ? <Ban size={TOGGLE_ICON_SIZE} /> : <CircleCheckBig size={TOGGLE_ICON_SIZE} />}
      {label}
    </UnstyledButton>
  );
}

export function BikePartsDesktop({ wizard }: { wizard: AddBikeWizard }): ReactElement {
  const { t } = useTranslation();
  const [chosenGroupId, setChosenGroupId] = useState<number | null>(null);
  const { componentEntries: entries, splitComponents: split, disabledComponents: disabled } = wizard;

  if (wizard.componentsPhase !== "idle") {
    return (
      <Box maw={440}>
        <LookupProgress kind="components" phase={wizard.componentsPhase} />
      </Box>
    );
  }

  if (wizard.componentsError) {
    return (
      <Stack gap={4}>
        <Text fw={700} c="red.4">
          {t("addBike.componentsFailedTitle")}
        </Text>
        <Text fz={14} c="text.7">
          {t("addBike.componentsFailedBody")}
        </Text>
      </Stack>
    );
  }

  const grouped = groupComponents(wizard.componentGroups ?? [], wizard.defaultComponents ?? []);
  const open = grouped.find((entry) => entry.group.id === chosenGroupId) ?? grouped.at(0);

  if (open === undefined) {
    return (
      <Stack gap={4}>
        <Text fw={700} c="text.6">
          {t("addBike.componentsEmptyTitle")}
        </Text>
        <Text fz={14} c="text.7">
          {t("addBike.componentsEmptyBody")}
        </Text>
      </Stack>
    );
  }

  const positionLabels: Record<ComponentPosition, string> = {
    front: t("addBike.positionFront"),
    rear: t("addBike.positionRear"),
    none: "",
  };

  function renderPart(component: AssembleBikeComponent): ReactElement {
    const typeId = componentTypeId(component);
    const absent = disabled.has(typeId);

    return (
      <Box
        key={typeId}
        py={9}
        style={{
          display: "grid",
          // One fixed column for the toggles, so every row's field ends on the same edge.
          gridTemplateColumns: `9rem minmax(0, 1fr) ${TOGGLES_WIDTH}`,
          alignItems: "center",
          gap: 12,
          borderTop: "1px solid var(--color-border-subtle)",
        }}
      >
        <Text fz={14} fw={600} c={absent ? "text.9" : "text.6"} td={absent ? "line-through" : undefined}>
          {translatedName(component.component_i18n_key, component.component_name, t)}
        </Text>
        <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
          {(absent ? (["none"] as ComponentPosition[]) : positionsOf(component, split)).map((position) => (
            <TextInput
              key={position}
              aria-label={`${component.component_name} ${positionLabels[position]}`.trim()}
              placeholder={
                absent
                  ? COPY.absentPlaceholder
                  : position === "none"
                    ? t("addBike.componentPlaceholder")
                    : positionLabels[position]
              }
              disabled={absent}
              value={absent ? "" : readEntry(entries, typeId, position).description}
              onChange={(event) => wizard.changeComponentDescription(typeId, position, event.currentTarget.value)}
              styles={{ input: { ...inputStyles.input, opacity: absent ? 0.5 : 1 } }}
              style={{ flex: 1, minWidth: 0 }}
            />
          ))}
        </Group>
        <Group gap={8} wrap="nowrap" justify="flex-end">
          {component.has_position && !absent && (
            <SplitToggle
              split={isSplit(component, split)}
              label={isSplit(component, split) ? t("addBike.splitSides") : t("addBike.mergeSides")}
              onToggle={() => wizard.toggleComponentSplit(typeId)}
            />
          )}
          <AbsentToggle
            absent={absent}
            label={absent ? t("addBike.partAbsentUndo") : t("addBike.partAbsent")}
            onToggle={() => wizard.toggleComponentDisabled(typeId)}
          />
        </Group>
      </Box>
    );
  }

  return (
    <Box className="grid items-start gap-5 grid-cols-1 xl:grid-cols-[12.5rem_minmax(0,1fr)]">
      <Box component="nav" className="flex flex-row flex-wrap gap-1 xl:flex-col xl:flex-nowrap">
        {grouped.map(({ group, components }) => {
          const active = group.id === open.group.id;
          const filled = countConfigured(entries, components, split, disabled);
          const fields = countFields(components, split, disabled);
          return (
            <UnstyledButton
              key={group.id}
              aria-current={active ? "true" : undefined}
              onClick={() => setChosenGroupId(group.id)}
              className="hover-veil"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "10px 12px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                backgroundColor: active ? "var(--mantine-color-cards-6)" : "transparent",
                color: active ? "var(--mantine-color-primary-6)" : "var(--mantine-color-text-6)",
              }}
            >
              <Group component="span" gap={10} wrap="nowrap">
                {categoryIcon(group.group_name, NAV_ICON_SIZE)}
                <span>{translatedName(group.i18n_key, group.group_name, t)}</span>
              </Group>
              <Text
                component="span"
                fz={12}
                fw={500}
                className="tabular-nums"
                c={fields > 0 && filled === fields ? "primary.6" : "var(--color-text-dim)"}
                style={{ whiteSpace: "nowrap" }}
              >
                {filled} {COPY.of} {fields}
              </Text>
            </UnstyledButton>
          );
        })}
      </Box>

      <Paper radius="lg" px="lg" pt={6} pb={10} style={cardSurface}>
        <Group justify="space-between" align="baseline" py={14}>
          <Text fw={700} fz={16} c="text.6">
            {translatedName(open.group.i18n_key, open.group.group_name, t)}
          </Text>
          <Text fz={13} c="var(--color-text-dim)" className="tabular-nums">
            {t("addBike.partsConfigured", {
              count: countConfigured(entries, open.components, split, disabled),
              total: countFields(open.components, split, disabled),
            })}
          </Text>
        </Group>
        {open.components.map(renderPart)}
      </Paper>
    </Box>
  );
}
