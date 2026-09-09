// One part on the bike, as the build lists it: what it is, what the owner called it, and
// how far it has come. The text is the button that opens the part's detail sheet; the
// kebab beside it is its sibling, carrying everything that can be done to the part
// (ADR 0018). A part that has come off is a record, so it carries no kebab at all.
import type { ReactElement } from "react";
import type { TFunction } from "i18next";
import { ActionIcon, Group, Menu, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { ArrowLeftRight, MoreVertical, PackageMinus, Pencil, Trash2 } from "lucide-react";
import type { BikeComponent, PartActions } from "../components.types";
import { componentTypeName, positionLabel } from "../componentLabels";

interface BikeComponentRowProps {
  component: BikeComponent;
  // A part that has come off says which season it served. It is a record rather than a
  // build item, so it is given no actions and renders no kebab.
  readOnly?: boolean;
  // The Action a Replacement of this part would be recorded under, resolved by the
  // category card. Null while the catalogue is still arriving.
  replacementActionId?: number | null;
  onOpen: (component: BikeComponent) => void;
  actions?: PartActions;
}

export function BikeComponentRow({
  component,
  readOnly = false,
  replacementActionId = null,
  onOpen,
  actions,
}: BikeComponentRowProps): ReactElement {
  const { t } = useTranslation();

  const position = positionLabel(component.position, t);
  const described = component.component_desc?.trim();
  const wear = wearLabel(component, t);

  return (
    // The card is the category around it, so the row carries no surface of its own — only
    // the hairline that tells it from the row above, or from the category header.
    <Group
      justify="space-between"
      wrap="nowrap"
      gap="sm"
      pr={readOnly ? "md" : 6}
      style={{ borderTop: "1px solid var(--color-border-subtle)" }}
    >
      {/* The reading half of the row. The kebab is beside it, never inside it: a button
          within a button is not valid markup. */}
      <UnstyledButton
        onClick={() => onOpen(component)}
        pl="md"
        pr={readOnly ? 0 : "xs"}
        py={12}
        style={{ display: "block", minWidth: 0, flex: 1 }}
      >
        <Stack gap={2} style={{ minWidth: 0 }}>
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
      </UnstyledButton>

      {/* A part off the bike cannot be replaced, corrected, dismounted or deleted, so it
          is offered none of them. */}
      {!readOnly && actions !== undefined && (
        <RowMenu component={component} replacementActionId={replacementActionId} actions={actions} />
      )}
    </Group>
  );
}

// The four things an owner can do to a mounted part, in one fixed order so muscle memory
// carries across parts. All four are always listed; only Delete is ever disabled, and it
// says why rather than going missing (ADR 0018).
function RowMenu({
  component,
  replacementActionId,
  actions,
}: {
  component: BikeComponent;
  replacementActionId: number | null;
  actions: PartActions;
}): ReactElement {
  const { t } = useTranslation();

  return (
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

      {/* Wears the same surface as the bike's own menu, so the app has one dropdown. */}
      <Menu.Dropdown
        bg="cards.6"
        p={8}
        style={{ border: "1px solid var(--mantine-color-cards-6)", boxShadow: "var(--elev-panel)" }}
      >
        {/* Replacing leads, because it is the one that records real work. Every Component
            Type is covered by a Replacement (ADR 0018), so the only reason it is not yet
            actionable is the category's catalogue still being on its way. */}
        <Menu.Item
          color="text"
          py={12}
          fw={600}
          leftSection={<ArrowLeftRight size={18} />}
          disabled={replacementActionId === null}
          onClick={() => {
            if (replacementActionId !== null) actions.onReplace(component, replacementActionId);
          }}
        >
          {t("bikeComponents.replace")}
        </Menu.Item>

        <Menu.Item
          color="text"
          py={12}
          fw={600}
          leftSection={<Pencil size={18} />}
          onClick={() => actions.onEdit(component)}
        >
          {t("bikeComponents.edit")}
        </Menu.Item>

        <Menu.Item
          color="text"
          py={12}
          fw={600}
          leftSection={<PackageMinus size={18} />}
          onClick={() => actions.onDismount(component)}
        >
          {t("bikeComponents.dismount")}
        </Menu.Item>

        {/* Only a part no Service has touched may be taken back; deleting a serviced one
            would orphan the work recorded against it (ADR 0016). The item stays listed
            and disabled, so the rule is taught rather than hidden. */}
        <Menu.Item
          color="red.5"
          py={12}
          fw={600}
          leftSection={<Trash2 size={18} />}
          disabled={!component.unserviced}
          onClick={() => actions.onDelete(component)}
        >
          {t("bikeComponents.delete")}
        </Menu.Item>

        {!component.unserviced && (
          <Text fz={11} c="var(--color-text-dim)" px={12} pb={4} style={{ maxWidth: 220 }}>
            {t("bikeComponents.deleteBlocked")}
          </Text>
        )}
      </Menu.Dropdown>
    </Menu>
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
