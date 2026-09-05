// One part on the bike, as the build lists it: what it is, what the owner called it, and
// how far it has come. Everything else about the part — when it went on, when it was last
// serviced, how healthy it is — and everything that can be done to it live in the detail
// sheet the row opens, so the row is one tap target with nothing competing inside it.
import type { ReactElement } from "react";
import type { TFunction } from "i18next";
import { Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { ChevronRight } from "lucide-react";
import type { BikeComponent } from "@/features/components/components.types";
import { componentTypeName, positionLabel } from "@/features/components/componentLabels";

interface BikeComponentRowProps {
  component: BikeComponent;
  // A part that has come off says which season it served; a mounted one has nothing to say
  // there that the sheet does not say better.
  readOnly?: boolean;
  onOpen: (component: BikeComponent) => void;
}

export function BikeComponentRow({ component, readOnly = false, onOpen }: BikeComponentRowProps): ReactElement {
  const { t } = useTranslation();

  const position = positionLabel(component.position, t);
  const described = component.component_desc?.trim();
  const wear = wearLabel(component, t);

  return (
    // The card is the category around it, so the row carries no surface of its own — only
    // the hairline that tells it from the row above, or from the category header.
    <UnstyledButton
      onClick={() => onOpen(component)}
      px="md"
      py={12}
      style={{ display: "block", width: "100%", borderTop: "1px solid var(--color-border-subtle)" }}
    >
      <Group justify="space-between" wrap="nowrap" gap="sm">
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

          {/* What the part has accumulated, in the mono face. A part with nothing on
              record yet has no line at all, rather than one holding a placeholder. */}
          {(wear !== null || readOnly) && (
            <Group gap={10} wrap="wrap" mt={2}>
              {wear !== null && (
                <Text className="font-mono" fz={13} c="var(--color-text-dim)">
                  {wear}
                </Text>
              )}
              {readOnly && (
                <Text className="font-mono" fz={13} c="var(--color-text-dim)">
                  {removedLabel(component, t)}
                </Text>
              )}
            </Group>
          )}
        </Stack>

        <ChevronRight size={16} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />
      </Group>
    </UnstyledButton>
  );
}

// The wear the part carries, in whatever it has accumulated: distance for a chain, hours
// for a fork, both where both were recorded. A part with nothing on record has no wear to
// report, and returns null so the row leaves the line out.
function wearLabel(component: BikeComponent, t: TFunction): string | null {
  const parts: string[] = [];
  if (component.total_km !== null && component.total_km > 0) {
    parts.push(t("bikes.kilometres", { count: component.total_km }));
  }
  if (component.total_time_min !== null && component.total_time_min > 0) {
    parts.push(t("bikes.hours", { count: Math.round(component.total_time_min / 60) }));
  }
  return parts.length === 0 ? null : parts.join(" · ");
}

// Which season the part served, for one that has come off.
function removedLabel(component: BikeComponent, t: TFunction): string {
  if (component.removed_at === null) return t("bikeComponents.dismountedOn", { date: "—" });
  return t("bikeComponents.dismountedOn", { date: dayjs(component.removed_at).format("D. M. YYYY") });
}
