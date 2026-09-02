// Where a part is added to a bike and where one is corrected. One form for both: the two
// ask for the same things, and only the Component Type picker differs — a part's kind is
// chosen once and is not a correction afterwards.
import { useState, type ReactElement } from "react";
import { Button, Chip, Drawer, Group, NumberInput, Select, Stack, Text, TextInput } from "@mantine/core";
import { DatePickerInput, DatesProvider } from "@mantine/dates";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { Lock } from "lucide-react";
import {
  useComponentGroups,
  useCreateBikeComponent,
  useDefaultComponents,
  useUpdateBikeComponent,
} from "@/features/components/components.queries";
import type {
  AssembleBikeComponent,
  BikeComponent,
  BikeComponentFields,
  ComponentGroup,
} from "@/features/components/components.types";
import { componentTypeName } from "@/features/components/componentLabels";
import { catalogueLabel } from "@/features/service/serviceLabels";
import { chipStyles, dropdownProps, inputStyles } from "@/features/add_bike_page/formStyles";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import { useOverlayBack } from "@/hooks/useOverlayBack";

// Above the section it is opened from, below the confirmations it can raise.
const FORM_Z_INDEX = 300;
const CALENDAR_Z_INDEX = 350;

// A day, sent as the instant the backend reads back as that day — the same conversion the
// service wizard makes.
function toIsoDate(day: string): string {
  return new Date(`${day}T00:00:00.000Z`).toISOString();
}

interface BikeComponentFormDrawerProps {
  opened: boolean;
  onClose: () => void;
  bikeId: number;
  // Which catalogue the type picker offers — a motor is not offered on an acoustic bike.
  ebike: boolean;
  // The part being corrected, or null when one is being added.
  component: BikeComponent | null;
}

// Remounting the body on each opening is what discards a cancelled edit: the fields are
// born from the part rather than being reset back to it afterwards, and a second add does
// not inherit the first.
export function BikeComponentFormDrawer(props: BikeComponentFormDrawerProps): ReactElement {
  return <BikeComponentFormBody key={formKey(props)} {...props} />;
}

function formKey({ opened, component }: BikeComponentFormDrawerProps): string {
  if (!opened) return "closed";
  return component === null ? "add" : `edit-${String(component.id)}`;
}

function BikeComponentFormBody({
  opened,
  onClose,
  bikeId,
  ebike,
  component,
}: BikeComponentFormDrawerProps): ReactElement {
  const { t, i18n } = useTranslation();
  const keyboardOffset = useKeyboardOffset();
  const { data: catalogue } = useDefaultComponents(ebike);
  const { data: groups } = useComponentGroups();
  const create = useCreateBikeComponent();
  const update = useUpdateBikeComponent();

  const editing = component !== null;
  // A part a Service has touched keeps its wear and its mounted date (ADR 0016).
  const wearLocked = editing && !component.unserviced;

  // What is on the bike now is where every field starts.
  const [typeId, setTypeId] = useState<string | null>(
    component === null ? null : String(component.component_type_id),
  );
  const [description, setDescription] = useState(component?.component_desc ?? "");
  const [position, setPosition] = useState(component?.position ?? "");
  const [distance, setDistance] = useState<number | string>(component?.total_km ?? "");
  const initialHours: number | string =
    component === null || component.total_time_min === null ? "" : Math.round(component.total_time_min / 60);
  const [hours, setHours] = useState<number | string>(initialHours);
  const [mountedOn, setMountedOn] = useState<string | null>(
    component?.mounted_at == null ? null : dayjs(component.mounted_at).format("YYYY-MM-DD"),
  );

  // Android's back gesture dismisses this rather than the page under it.
  useOverlayBack(opened, onClose);

  // On an edit the picker is gone, so the type is the part's own; either way the entry in
  // the catalogue is what says whether the kind of part sits on a side of the bike.
  const selected = catalogue?.find((entry) => String(entry.component.component_type_id) === typeId);
  // A part already recorded with a side keeps its picker even if the catalogue disagrees,
  // so a position that exists can always be corrected.
  const takesPosition = (selected?.has_position ?? false) || (component?.position ?? null) !== null;
  const pending = create.isPending || update.isPending;
  const failed = create.isError || update.isError;

  function fieldsToSave(): BikeComponentFields {
    const written: BikeComponentFields = {
      component_desc: description.trim() === "" ? null : description.trim(),
      position: takesPosition && position !== "" ? position : null,
    };

    // A hardened part is not sent wear or a mounted date at all: the server would refuse
    // them, and the form has already said so rather than offering the fields.
    if (wearLocked) return written;

    return {
      ...written,
      total_km: distance === "" ? null : Number(distance),
      // The field shows whole hours, so a part carrying 605 minutes reads as 10. Writing
      // that back would quietly round the minutes off, so an untouched field sends what
      // the part already had.
      total_time_min: hours === initialHours ? (component?.total_time_min ?? null) : minutesFrom(hours),
      mounted_at: mountedOn === null ? null : toIsoDate(mountedOn),
    };
  }

  function submit(): void {
    if (editing) {
      update.mutate({ id: component.id, bikeId, fields: fieldsToSave() }, { onSuccess: onClose });
      return;
    }

    if (typeId === null) return;
    create.mutate({ bike_id: bikeId, component_type_id: Number(typeId), ...fieldsToSave() }, { onSuccess: onClose });
  }

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="bottom"
      radius="lg"
      zIndex={FORM_Z_INDEX}
      title={editing ? componentTypeName(component, t) : t("bikeComponents.addTitle")}
      overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
      styles={{
        content: {
          backgroundColor: "var(--mantine-color-cards-6)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "88dvh",
          // Rides above the software keyboard, which the webview does not resize for.
          marginBottom: keyboardOffset,
        },
        header: { backgroundColor: "var(--mantine-color-cards-6)" },
        body: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflowY: "auto" },
        title: { fontWeight: 600, color: "var(--mantine-color-text-6)" },
      }}
    >
      <DatesProvider settings={{ locale: i18n.language.split("-")[0] }}>
        <Stack gap="md" pb="calc(1rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))">
          {/* The kind of part is chosen once. Correcting it would be a different part. */}
          {!editing && (
            <Select
              label={t("bikeComponents.typeLabel")}
              placeholder={t("bikeComponents.typePlaceholder")}
              data={catalogueOptions(catalogue, groups, t)}
              value={typeId}
              onChange={setTypeId}
              searchable
              styles={inputStyles}
              comboboxProps={dropdownProps}
            />
          )}

          <TextInput
            label={t("bikeComponents.descriptionLabel")}
            placeholder={t("bikeComponents.descriptionPlaceholder")}
            value={description}
            maxLength={400}
            styles={inputStyles}
            onChange={(event) => setDescription(event.currentTarget.value)}
          />

          {/* Offered only for a kind of part that sits on a side of the bike. */}
          {takesPosition && (
            <Stack gap={6}>
              <Text style={inputStyles.label}>{t("bikeComponents.positionLabel")}</Text>
              <Chip.Group multiple={false} value={position} onChange={setPosition}>
                <Group gap="xs">
                  <Chip value="front" radius="xl" size="sm" styles={chipStyles(position === "front", { wrap: false })}>
                    {t("addBike.positionFront")}
                  </Chip>
                  <Chip value="rear" radius="xl" size="sm" styles={chipStyles(position === "rear", { wrap: false })}>
                    {t("addBike.positionRear")}
                  </Chip>
                </Group>
              </Chip.Group>
            </Stack>
          )}

          {/* The wear the part arrives with, so a second-hand fork does not pretend to be
              new — and the day it went on, so its age is right even when it is recorded
              months later. Both are frozen once a Service has measured against them. */}
          <Group grow align="flex-start" wrap="nowrap">
            <NumberInput
              label={t("bikeComponents.distanceLabel")}
              placeholder="0"
              value={distance}
              min={0}
              allowNegative={false}
              decimalScale={0}
              disabled={wearLocked}
              styles={inputStyles}
              onChange={setDistance}
            />
            <NumberInput
              label={t("bikeComponents.hoursLabel")}
              placeholder="0"
              value={hours}
              min={0}
              allowNegative={false}
              decimalScale={0}
              disabled={wearLocked}
              styles={inputStyles}
              onChange={setHours}
            />
          </Group>

          <DatePickerInput
            label={t("bikeComponents.mountedLabel")}
            placeholder={t("bikeComponents.mountedPlaceholder")}
            value={mountedOn}
            onChange={setMountedOn}
            clearable={!wearLocked}
            disabled={wearLocked}
            // A part cannot have gone on after today.
            maxDate={dayjs().format("YYYY-MM-DD")}
            styles={inputStyles}
            popoverProps={{
              zIndex: CALENDAR_Z_INDEX,
              styles: {
                dropdown: {
                  backgroundColor: "var(--mantine-color-cards-6)",
                  border: "1px solid var(--mantine-color-inputs-5)",
                },
              },
            }}
          />

          {/* The values stay readable; what changes is that they cannot be rewritten. A
              disabled field with no reason beside it is a field to be guessed at. */}
          {wearLocked && (
            <Group gap={8} align="flex-start" wrap="nowrap">
              <Lock size={16} color="var(--color-text-dim)" style={{ flexShrink: 0, marginTop: 2 }} />
              <Text fz={13} c="var(--color-text-dim)" style={{ lineHeight: 1.45 }}>
                {t("bikeComponents.wearLocked")}
              </Text>
            </Group>
          )}

          {/* A dropped connection must not cost the owner the form, so nothing is cleared
              and nothing is closed. */}
          {failed && (
            <Text fz={13} c="red.5">
              {t("bikeComponents.saveFailed")}
            </Text>
          )}

          <Button
            color="primary.6"
            radius="md"
            mt="xs"
            h="3rem"
            disabled={(!editing && typeId === null) || pending}
            loading={pending}
            onClick={submit}
          >
            {t("bikeComponents.save")}
          </Button>
        </Stack>
      </DatesProvider>
    </Drawer>
  );
}

function minutesFrom(hours: number | string): number | null {
  return hours === "" ? null : Math.round(Number(hours) * 60);
}

// The catalogue as the picker reads it: types under the category they belong to, in the
// order the categories were seeded. A category with nothing in it is not offered.
function catalogueOptions(
  catalogue: AssembleBikeComponent[] | undefined,
  groups: ComponentGroup[] | undefined,
  t: (key: string) => string,
): { group: string; items: { value: string; label: string }[] }[] {
  if (catalogue === undefined || groups === undefined) return [];

  return groups
    .map((group) => ({
      group: catalogueLabel(group.i18n_key, group.group_name, t),
      items: catalogue
        .filter((entry) => entry.component_group_id === group.id)
        .map((entry) => ({
          value: String(entry.component.component_type_id),
          label: catalogueLabel(entry.component_i18n_key, entry.component_name, t),
        })),
    }))
    .filter((option) => option.items.length > 0);
}
