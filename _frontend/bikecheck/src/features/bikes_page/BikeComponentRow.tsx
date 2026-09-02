// One part on the bike, and what can be done with it. Which affordances the row offers is
// decided by the read's Unserviced flag alone — never re-derived here (ADR 0016). There is
// no Replace: every Replacement carries a Service behind it (ADR 0015).
import type { ReactElement } from "react";
import type { TFunction } from "i18next";
import { ActionIcon, Group, Menu, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { MoreVertical, PackageMinus, Pencil, Trash2 } from "lucide-react";
import type { BikeComponent } from "@/features/components/components.types";
import { componentTypeName, positionLabel } from "@/features/components/componentLabels";

interface BikeComponentRowProps {
  component: BikeComponent;
  // A part that has come off is a record, not a build item: it carries no menu.
  readOnly?: boolean;
  onEdit: (component: BikeComponent) => void;
  onDismount: (component: BikeComponent) => void;
  onDelete: (component: BikeComponent) => void;
}

export function BikeComponentRow({
  component,
  readOnly = false,
  onEdit,
  onDismount,
  onDelete,
}: BikeComponentRowProps): ReactElement {
  const { t } = useTranslation();

  const position = positionLabel(component.position, t);
  const described = component.component_desc?.trim();

  return (
    <Paper
      radius="md"
      p="sm"
      style={{
        backgroundColor: "var(--mantine-color-cards-6)",
        backgroundImage: "var(--card-glow)",
        border: "1px solid var(--mantine-color-cards-6)",
        boxShadow: "var(--elev-row)",
      }}
    >
      <Group justify="space-between" wrap="nowrap" gap="sm" align="flex-start">
        <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
          {/* The kind of part leads, in the body face. The side it sits on rides with it,
              because that is what makes the front brake readable as not the rear one. */}
          <Group gap={6} wrap="nowrap">
            <Text fz={16} fw={600} c="text.6" lineClamp={1}>
              {componentTypeName(component, t)}
            </Text>
            {position !== null && (
              <Text
                className="font-mono"
                fz={11}
                fw={400}
                tt="uppercase"
                lts="0.08em"
                c="var(--color-text-dim)"
                style={{ flexShrink: 0 }}
              >
                {position}
              </Text>
            )}
          </Group>

          {/* What the owner called it — how two wheelsets are told apart. */}
          {described !== undefined && described !== "" && (
            <Text fz={13} c="var(--color-text-dim)" lineClamp={1}>
              {described}
            </Text>
          )}

          {/* Everything measured about the part, in the mono face. */}
          <Group gap={10} wrap="wrap" mt={2}>
            <Text className="font-mono" fz={13} c="var(--color-text-dim)">
              {wearLabel(component, t)}
            </Text>
            <Text className="font-mono" fz={13} c="var(--color-text-dim)">
              {readOnly ? removedLabel(component, t) : serviceLabel(component, t)}
            </Text>
          </Group>
        </Stack>

        {!readOnly && (
          <Menu position="bottom-end" radius="md" withinPortal>
            <Menu.Target>
              <ActionIcon
                variant="transparent"
                radius="xl"
                size="md"
                aria-label={t("bikeComponents.rowMenu")}
                style={{ flexShrink: 0 }}
              >
                <MoreVertical size={18} color="var(--color-text-dim)" />
              </ActionIcon>
            </Menu.Target>

            {/* The same surface every dropdown in the app stands on. */}
            <Menu.Dropdown
              bg="cards.6"
              p={8}
              style={{ border: "1px solid var(--mantine-color-cards-6)", boxShadow: "var(--elev-panel)" }}
            >
              <Menu.Item
                color="text"
                py={10}
                fw={600}
                leftSection={<Pencil size={16} />}
                onClick={() => onEdit(component)}
              >
                {t("bikeComponents.edit")}
              </Menu.Item>

              <Menu.Item
                color="text"
                py={10}
                fw={600}
                leftSection={<PackageMinus size={16} />}
                onClick={() => onDismount(component)}
              >
                {t("bikeComponents.dismount")}
              </Menu.Item>

              {/* Only a part no Service has touched may be taken back; deleting a serviced
                  one would orphan the work recorded against it. */}
              {component.unserviced && (
                <Menu.Item
                  color="red.5"
                  py={10}
                  fw={600}
                  leftSection={<Trash2 size={16} />}
                  onClick={() => onDelete(component)}
                >
                  {t("bikeComponents.delete")}
                </Menu.Item>
              )}
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>
    </Paper>
  );
}

// The wear the part carries, in whatever it has accumulated: distance for a chain, hours
// for a fork, both where both were recorded. A part with nothing on record reads as a dash
// rather than as a zero, the way the bike's own weight does.
function wearLabel(component: BikeComponent, t: TFunction): string {
  const parts: string[] = [];
  if (component.total_km !== null && component.total_km > 0) {
    parts.push(t("bikes.kilometres", { count: component.total_km }));
  }
  if (component.total_time_min !== null && component.total_time_min > 0) {
    parts.push(t("bikes.hours", { count: Math.round(component.total_time_min / 60) }));
  }
  return parts.length === 0 ? "—" : parts.join(" · ");
}

// A part nobody has serviced says so, rather than showing a blank to be read as an error.
function serviceLabel(component: BikeComponent, t: TFunction): string {
  if (component.last_service_at === null) return t("bikeComponents.neverServiced");
  return t("bikeComponents.lastServiced", { date: dayjs(component.last_service_at).format("D. M. YYYY") });
}

// Which season the part served, for one that has come off.
function removedLabel(component: BikeComponent, t: TFunction): string {
  if (component.removed_at === null) return t("bikeComponents.dismountedOn", { date: "—" });
  return t("bikeComponents.dismountedOn", { date: dayjs(component.removed_at).format("D. M. YYYY") });
}
