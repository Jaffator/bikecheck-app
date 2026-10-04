// PROTOTYPE (proto/desktop-wizards): step 3 on desktop - groups on the left, the open group's parts as rows.
import { useState, type ReactElement } from "react";
import { Box, Button, Group, Loader, Paper, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { AssembleBikeComponent } from "@/features/components/components.types";
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
import type { AddBikeWizard } from "../useAddBikeWizard";
import { COPY, cardSurface } from "./bikeProto";

// Room for "Rozdělit" and "Nemám" side by side.
const TOGGLES_WIDTH = "10.75rem";

function translatedName(i18nKey: string | null, fallback: string, translate: (key: string) => string): string {
  return i18nKey ? translate(i18nKey) : fallback;
}

// A quiet toggle that lights up while it is on.
function RowToggle({ label, pressed, onToggle }: { label: string; pressed: boolean; onToggle: () => void }): ReactElement {
  return (
    <Button
      variant="default"
      radius="md"
      aria-pressed={pressed}
      onClick={onToggle}
      styles={{
        root: {
          height: "2.4rem",
          padding: "0 0.75rem",
          fontSize: 13,
          backgroundColor: pressed
            ? "color-mix(in srgb, var(--mantine-color-primary-6) 15%, transparent)"
            : "var(--mantine-color-cards-7)",
          border: pressed ? "1px solid var(--mantine-color-primary-7)" : "1px solid var(--mantine-color-inputs-5)",
          color: pressed ? "var(--mantine-color-primary-6)" : "var(--mantine-color-text-6)",
        },
      }}
    >
      {label}
    </Button>
  );
}

export function BikePartsDesktop({ wizard }: { wizard: AddBikeWizard }): ReactElement {
  const { t } = useTranslation();
  const [chosenGroupId, setChosenGroupId] = useState<number | null>(null);
  const { componentEntries: entries, splitComponents: split, disabledComponents: disabled } = wizard;

  if (wizard.componentsLoading) {
    return (
      <Group gap="sm" p="xl" justify="center">
        <Loader size="sm" color="primary.6" />
        <Text fz={14} c="text.7">
          {t("addBike.componentsLoading")}
        </Text>
      </Group>
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
        <Text fz={14} fw={600} c={absent ? "text.9" : "text.6"}>
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
            <RowToggle
              label={isSplit(component, split) ? t("addBike.mergeSides") : t("addBike.splitSides")}
              pressed={isSplit(component, split)}
              onToggle={() => wizard.toggleComponentSplit(typeId)}
            />
          )}
          <RowToggle
            label={t("addBike.partAbsent")}
            pressed={absent}
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
              <span>{translatedName(group.i18n_key, group.group_name, t)}</span>
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
