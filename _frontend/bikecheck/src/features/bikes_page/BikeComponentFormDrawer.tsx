// Where a part is added to a bike and where one is corrected. One form for both: the two
// ask for the same things, and only the Component Type picker differs — a part's kind is
// chosen once and is not a correction afterwards.
import { useState, type ReactElement } from "react";
import {
  ActionIcon,
  Box,
  Button,
  Chip,
  Drawer,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  Textarea,
  UnstyledButton,
  type ComboboxItem,
  type ComboboxParsedItem,
} from "@mantine/core";
import { DatePickerInput, DatesProvider } from "@mantine/dates";
import { CalendarDays, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { Lock } from "lucide-react";
import { ApiError } from "@/api/client";
import {
  useBikeComponents,
  useComponentGroups,
  useCreateBikeComponent,
  useCreateComponentType,
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
import { categoryIcon } from "@/features/service/categoryIcon";
import { catalogueLabel } from "@/features/service/serviceLabels";
import { chipStyles, disabledButtonStyles, dropdownProps, inputStyles } from "@/features/add_bike_page/formStyles";
import { SIDED_POSITIONS } from "@/features/add_bike_page/bikeComponents.types";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import { useOverlayBack } from "@/hooks/useOverlayBack";

// Above the detail sheet it is opened from, below the confirmations it can raise.
const FORM_Z_INDEX = 320;
const CALENDAR_Z_INDEX = 350;

// A correction is opened over the detail sheet, so it holds that sheet's height and the
// layer does not resize under the owner. Adding a part starts from the build and has a
// picker, a carousel and every field to fit, so it takes more of the screen.
const EDIT_HEIGHT = "70vh";
const ADD_HEIGHT = "80vh";

// Long enough for the keyboard to have finished opening, so the field is moved against the
// viewport it actually leaves rather than the one on the way there.
const FIELD_REVEAL_DELAY_MS = 300;

// Small enough that a whole category card stays under the thumb, on a strip that scrolls.
const CATEGORY_ICON_SIZE = 24;

// The picker entry that stands for a kind of part the catalogue does not carry. Not an id,
// so it can never be mistaken for one.
const CREATE_VALUE = "create";

// A part recorded without a side holds a slot of its own, which is neither front nor rear
// (ADR 0020). Keyed as the empty string, because a Set cannot hold null usefully here.
const NO_SIDE = "";

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

function BikeComponentFormBody({ opened, onClose, bikeId, ebike, component }: BikeComponentFormDrawerProps): ReactElement {
  const { t, i18n } = useTranslation();
  const keyboardOffset = useKeyboardOffset();
  const { data: catalogue } = useDefaultComponents(ebike);
  const { data: groups } = useComponentGroups();
  // The build the section has already loaded, read from the same cache entry: what is on
  // the bike is what says which slots are free.
  const { data: mounted } = useBikeComponents(bikeId);
  const create = useCreateBikeComponent();
  const update = useUpdateBikeComponent();
  const createType = useCreateComponentType();

  const editing = component !== null;
  // A part a Service has touched keeps its wear and its mounted date (ADR 0016).
  const wearLocked = editing && !component.unserviced;

  // What is on the bike now is where every field starts.
  const [typeId, setTypeId] = useState<string | null>(component === null ? null : String(component.component_type_id));
  // What the owner typed into the picker, and the name they are naming a new kind of part
  // with — kept apart, because the search box is retyped and the name must not be.
  const [search, setSearch] = useState("");
  const [customName, setCustomName] = useState("");
  // Which category the type picker is narrowed to. Null offers the whole catalogue, which
  // is the flat list the picker was built as.
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [description, setDescription] = useState(component?.component_desc ?? "");
  const [position, setPosition] = useState(component?.position ?? "");
  const [distance, setDistance] = useState<number | string>(component?.total_km ?? "");
  const initialHours: number | string =
    component === null || component.total_time_min === null ? "" : Math.round(component.total_time_min / 60);
  const [hours, setHours] = useState<number | string>(initialHours);
  const [mountedOn, setMountedOn] = useState<string | null>(initialMountedOn(component));

  // Android's back gesture dismisses this rather than the page under it.
  useOverlayBack(opened, onClose);

  const naming = typeId === CREATE_VALUE;
  const taken = takenSlots(mounted);
  // On an edit the picker is gone, so the type is the part's own; either way the entry in
  // the catalogue is what says whether the kind of part sits on a side of the bike.
  const selected = catalogue?.find((entry) => String(entry.component.component_type_id) === typeId);
  // A part the owner names belongs to the category the strip is on: the catalogue cannot
  // guess it, and it is the one place a category is chosen.
  const customGroup = groups?.find((group) => group.id === categoryId);
  // A part already recorded with a side keeps its picker even if the catalogue disagrees,
  // so a position that exists can always be corrected. A part being named takes its side
  // from the category it is put in, which is where side_choice lives.
  const takesPosition = naming
    ? (customGroup?.side_choice ?? false)
    : (selected?.has_position ?? false) || (component?.position ?? null) !== null;
  // The side is half the slot key, so a new part cannot leave it out. An existing one can:
  // demanding it before a description may be corrected would be work for somebody else's
  // omission (ADR 0020).
  const positionRequired = !editing && takesPosition;
  const takenSides = typeId === null || naming ? new Set<string>() : (taken.get(Number(typeId)) ?? new Set<string>());
  const inCategory = categoryId === null ? catalogue : catalogue?.filter((entry) => entry.component_group_id === categoryId);
  const options = catalogueOptions(inCategory, taken, t, i18n.language);
  // Only the categories the catalogue has parts in, in the order the groups are served.
  const categories = (groups ?? []).filter((group) =>
    (catalogue ?? []).some((entry) => entry.component_group_id === group.id),
  );
  const someTypeTaken = options.some((option) => option.disabled === true);
  const pending = create.isPending || update.isPending || createType.isPending;
  const failed = create.isError || update.isError || createType.isError;
  const incomplete =
    !editing &&
    (typeId === null ||
      (naming && (customName === "" || customGroup === undefined)) ||
      (positionRequired && position === ""));

  // Narrowing the catalogue drops whatever was picked out of the wider one, and a part
  // named from here belongs to the category it was named in.
  // The keyboard covers the bottom of the form, so the field just tapped is scrolled up
  // inside the body. Waited on, because the keyboard is still animating open and the
  // viewport it leaves behind is not measurable until it stops.
  function revealField(event: React.FocusEvent<HTMLDivElement>): void {
    const field = event.target;
    window.setTimeout(() => {
      field.scrollIntoView({ behavior: "smooth", block: "center" });
    }, FIELD_REVEAL_DELAY_MS);
  }

  function pickCategory(id: number): void {
    const chosen = categoryId === id ? null : id;
    setCategoryId(chosen);
    setTypeId(null);
    setCustomName("");
    setPosition("");
    setSearch("");
  }

  function pickType(value: string | null): void {
    // The name is taken from the search box at the moment the option is chosen, because
    // Mantine rewrites the search to the chosen option's label straight afterwards.
    setCustomName(value === CREATE_VALUE ? search.trim() : "");
    setTypeId(value);
    // A side free on one kind of part is not free on the next.
    setPosition("");
  }

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

  // Naming a kind of part is a write of its own, made just before the part that uses it.
  // A type that survives a failed mount is kept rather than unwound — it is the owner's
  // either way — and the picker moves onto it, so a second Save only mounts.
  async function submit(): Promise<void> {
    if (editing) {
      update.mutate({ id: component.id, bikeId, fields: fieldsToSave() }, { onSuccess: onClose });
      return;
    }

    let mountedTypeId = typeId;

    if (naming) {
      if (customGroup === undefined || customName === "") return;

      try {
        const created = await createType.mutateAsync({
          component_group_id: customGroup.id,
          component_type: customName,
          // Never e-bike-only: that would hide the owner's own part on their other bikes.
          ebike: false,
          has_position: customGroup.side_choice,
        });
        mountedTypeId = String(created.id);
        setTypeId(mountedTypeId);
        setSearch(customName);
        setCustomName("");
      } catch {
        // The mutation carries the failure; the form keeps everything the owner typed.
        return;
      }
    }

    if (mountedTypeId === null) return;
    create.mutate(
      {
        bike_id: bikeId,
        component_type_id: Number(mountedTypeId),
        ...fieldsToSave(),
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="bottom"
      radius="lg"
      zIndex={FORM_Z_INDEX}
      withCloseButton={false}
      overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
      styles={{
        content: {
          backgroundColor: "var(--mantine-color-cards-6)",
          display: "flex",
          flexDirection: "column",
          height: editing ? EDIT_HEIGHT : ADD_HEIGHT,
          // Rides above the software keyboard, which the webview does not resize for, and
          // gives back the height the keyboard took so its top edge stays on screen.
          marginBottom: keyboardOffset,
          maxHeight: `calc(100dvh - ${String(keyboardOffset)}px)`,
        },
        header: { backgroundColor: "var(--mantine-color-cards-6)" },
        body: {
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          paddingTop: 0,
        },
      }}
    >
      {/* The same grab bar and heading the detail sheet wears, so the form reads as the
          next layer of it rather than as a different screen. */}
      <Box
        mx="auto"
        mt="xs"
        mb="md"
        w={36}
        h={4}
        style={{
          borderRadius: 9999,
          backgroundColor: "var(--color-border-subtle)",
          flexShrink: 0,
        }}
      />

      <Group justify="space-between" wrap="nowrap" align="flex-start" gap="sm" mb="md">
        <Text fz={20} fw={700} c="text.6" lineClamp={2}>
          {editing
            ? t("bikeComponents.editTitle", {
                type: componentTypeName(component, t),
              })
            : t("bikeComponents.addTitle")}
        </Text>
        <ActionIcon
          variant="subtle"
          color="gray"
          radius="xl"
          size="md"
          aria-label={t("action.close")}
          onClick={onClose}
          style={{ flexShrink: 0 }}
        >
          <X size={18} color="var(--color-text-dim)" />
        </ActionIcon>
      </Group>

      {/* Only the questions scroll. Save and Cancel stay on the bottom edge, where the
          thumb is, however long the form runs. */}
      <Box style={{ flex: 1, minHeight: 0, overflowY: "auto" }} onFocusCapture={revealField}>
        <DatesProvider settings={{ locale: i18n.language.split("-")[0] }}>
          <Stack gap="md" pb="md">
            {/* The kind of part is chosen once. Correcting it would be a different part. */}
            {!editing && (
              <Stack gap={6}>
                <Text style={inputStyles.label}>{t("bikeComponents.categoryFilterLabel")}</Text>
                {/* Scrolls sideways rather than wrapping, so the picker under it keeps its
                  place however many categories the catalogue has. */}
                <Group gap="xs" wrap="nowrap" className="overflow-x-auto" pb={4} style={{ scrollbarWidth: "none" }}>
                  {categories.map((group) => (
                    <CategoryCard
                      key={group.id}
                      group={group}
                      selected={categoryId === group.id}
                      onSelect={() => pickCategory(group.id)}
                    />
                  ))}
                </Group>
              </Stack>
            )}

            {!editing && (
              <Stack gap={6}>
                <Select
                  label={t("bikeComponents.typeLabel")}
                  placeholder={t("bikeComponents.typePlaceholder")}
                  data={withCreateOption(options, search, naming, customName, t)}
                  value={typeId}
                  onChange={pickType}
                  searchable
                  searchValue={search}
                  onSearchChange={setSearch}
                  // Naming a part is never a match for what was typed, so the default filter
                  // would drop the one option the owner is reaching for.
                  filter={keepCreateOption}
                  styles={inputStyles}
                  comboboxProps={dropdownProps}
                />

                {/* A greyed option with no reason beside it reads as a missing part. */}
                {someTypeTaken && (
                  <Text fz={13} c="var(--color-text-dim)" style={{ lineHeight: 1.45 }}>
                    {t("bikeComponents.slotTakenHint")}
                  </Text>
                )}
              </Stack>
            )}

            {/* Grows with what is typed, up to four lines, and scrolls from there rather
              than pushing the rest of the form off the drawer. */}
            <Textarea
              label={t("bikeComponents.descriptionLabel")}
              placeholder={t("bikeComponents.descriptionPlaceholder")}
              value={description}
              maxLength={400}
              autosize
              minRows={3}
              maxRows={6}
              styles={inputStyles}
              onChange={(event) => setDescription(event.currentTarget.value)}
            />

            {/* Offered only for a kind of part that sits on a side of the bike. */}
            {takesPosition && (
              <Stack gap={6}>
                <Text style={inputStyles.label}>
                  {t("bikeComponents.positionLabel")}
                  {/* Half the slot key, so a new part cannot be saved without it. */}
                  {positionRequired && <span style={{ color: "var(--mantine-color-error)" }}> *</span>}
                </Text>
                <Chip.Group multiple={false} value={position} onChange={setPosition}>
                  <Group gap="xs">
                    {SIDED_POSITIONS.map((side) => (
                      <Chip
                        key={side}
                        value={side}
                        radius="xl"
                        size="sm"
                        disabled={!editing && takenSides.has(side)}
                        styles={chipStyles(position === side, { wrap: false })}
                      >
                        {side === "front" ? t("addBike.positionFront") : t("addBike.positionRear")}
                      </Chip>
                    ))}
                  </Group>
                </Chip.Group>

                {!editing && SIDED_POSITIONS.some((side) => takenSides.has(side)) && (
                  <Text fz={13} c="var(--color-text-dim)" style={{ lineHeight: 1.45 }}>
                    {t("bikeComponents.sideTakenHint")}
                  </Text>
                )}
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
                hideControls
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
                hideControls
                disabled={wearLocked}
                styles={inputStyles}
                onChange={setHours}
              />
            </Group>

            <DatePickerInput
              label={t("bikeComponents.mountedLabel")}
              placeholder={t("bikeComponents.mountedPlaceholder")}
              leftSection={<CalendarDays size={18} />}
              value={mountedOn}
              onChange={setMountedOn}
              // clearable={!wearLocked}
              disabled={wearLocked}
              maxDate={dayjs().format("YYYY-MM-DD")}
              styles={{
                ...inputStyles,
                calendarHeaderLevel: { color: "var(--mantine-color-text-6)" },
                calendarHeaderControl: { color: "var(--mantine-color-text-6)" },
                monthsListControl: { color: "var(--mantine-color-text-6)" },
                yearsListControl: { color: "var(--mantine-color-text-6)" },
                weekday: { color: "var(--color-text-dim)" },

                day: {
                  color: "var(--mantine-color-text-6)",
                  "--mantine-primary-color-filled": "var(--mantine-color-primary-6)",
                } as React.CSSProperties,
              }}
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
                {t(saveFailureKey(create.error ?? createType.error))}
              </Text>
            )}
          </Stack>
        </DatesProvider>
      </Box>

      {/* Leaving discards what was typed without asking, the same as the overlay and the
          back gesture already do. */}
      <Group
        grow
        gap="sm"
        wrap="nowrap"
        pt="md"
        pb="calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))"
        style={{
          flexShrink: 0,
        }}
      >
        <Button variant="outline" color="var(--mantine-color-cards-2)" radius="md" disabled={pending} onClick={onClose}>
          {t("bikeComponents.cancel")}
        </Button>
        <Button
          color="primary.6"
          radius="md"
          disabled={incomplete || pending}
          loading={pending}
          styles={disabledButtonStyles}
          onClick={() => void submit()}
        >
          {t("bikeComponents.save")}
        </Button>
      </Group>
    </Drawer>
  );
}

// A part being added went on today unless the owner says otherwise, which is true of nearly
// every one. An existing part with no day on record keeps none: inventing one would date a
// part the owner never dated.
function initialMountedOn(component: BikeComponent | null): string | null {
  if (component === null) return dayjs().format("YYYY-MM-DD");
  return component.mounted_at == null ? null : dayjs(component.mounted_at).format("YYYY-MM-DD");
}

function minutesFrom(hours: number | string): number | null {
  return hours === "" ? null : Math.round(Number(hours) * 60);
}

// A slot refused by the server rather than by the form — a build that changed in another
// tab, or a part added twice in quick succession — says so in its own words.
function saveFailureKey(error: Error | null): string {
  if (error instanceof ApiError && error.status === 409) return "bikeComponents.slotTaken";
  return "bikeComponents.saveFailed";
}

// Which slots each kind of part already holds on this bike, by type id. Only the parts
// still on the bike count: dismounting is what frees a slot (ADR 0020).
function takenSlots(mounted: BikeComponent[] | undefined): Map<number, Set<string>> {
  const slots = new Map<number, Set<string>>();
  if (mounted === undefined) return slots;

  for (const part of mounted) {
    if (part.is_active === false) continue;
    const sides = slots.get(part.component_type_id) ?? new Set<string>();
    sides.add(part.position?.toLowerCase() ?? NO_SIDE);
    slots.set(part.component_type_id, sides);
  }

  return slots;
}

// A kind of part is out of slots when both sides are taken, or — for one that does not sit
// on a side — when the bike already carries it.
function fullyTaken(sides: Set<string> | undefined, hasPosition: boolean): boolean {
  if (sides === undefined) return false;
  return hasPosition ? SIDED_POSITIONS.every((side) => sides.has(side)) : sides.has(NO_SIDE);
}

// The default filter matches on the label, and "Name your own part" matches nothing the
// owner is typing. It is kept whatever the search says; everything else filters normally.
function keepCreateOption({ options, search }: { options: ComboboxParsedItem[]; search: string }): ComboboxParsedItem[] {
  const query = search.trim().toLowerCase();

  return options.filter(
    (option) => !("group" in option) && (option.value === CREATE_VALUE || option.label.toLowerCase().includes(query)),
  );
}

// The catalogue plus the way out of it: the part the owner is about to name, offered last
// under the search they typed. Kept in the list once chosen, so the picker can still show it.
function withCreateOption(
  options: ComboboxItem[],
  search: string,
  naming: boolean,
  customName: string,
  t: (key: string, values?: Record<string, string>) => string,
): ComboboxItem[] {
  const name = naming ? customName : search.trim();
  if (name === "" || nameInCatalogue(options, name)) return options;

  return [...options, { value: CREATE_VALUE, label: t("bikeComponents.createType", { name }) }];
}

function nameInCatalogue(options: ComboboxItem[], name: string): boolean {
  return options.some((item) => item.label.toLowerCase() === name.toLowerCase());
}

// The categories a newly named part can be put into, in the order they were seeded.
// One category in the strip above the picker, wearing the icon it is known by everywhere
// else in the app. The chosen one is outlined rather than filled, which is how the form
// marks a chip already.
function CategoryCard({
  group,
  selected,
  onSelect,
}: {
  group: ComponentGroup;
  selected: boolean;
  onSelect: () => void;
}): ReactElement {
  const { t } = useTranslation();

  return (
    <UnstyledButton onClick={onSelect} style={{ flexShrink: 0 }}>
      <Stack
        gap={6}
        align="center"
        justify="center"
        w={96}
        py="sm"
        px="xs"
        style={{
          borderRadius: 12,
          backgroundColor: selected
            ? "color-mix(in srgb, var(--mantine-color-primary-6) 15%, transparent)"
            : "var(--mantine-color-cards-6)",
          border: `1px solid ${selected ? "var(--mantine-color-primary-6)" : "var(--color-border-subtle)"}`,
        }}
      >
        {categoryIcon(group.group_name, CATEGORY_ICON_SIZE)}
        <Text className="font-mono" fz={11} ta="center" lineClamp={1} c={selected ? "primary.6" : "var(--color-text-dim)"}>
          {catalogueLabel(group.i18n_key, group.group_name, t)}
        </Text>
      </Stack>
    </UnstyledButton>
  );
}

// The catalogue as the picker reads it: one flat list, alphabetical in the names the owner
// actually reads, so the order holds in either language. A type with no slot left is greyed
// rather than dropped — a vanished part reads as one the app does not know (ADR 0020).
function catalogueOptions(
  catalogue: AssembleBikeComponent[] | undefined,
  taken: Map<number, Set<string>>,
  t: (key: string) => string,
  language: string,
): ComboboxItem[] {
  if (catalogue === undefined) return [];

  return catalogue
    .map((entry) => ({
      value: String(entry.component.component_type_id),
      label: catalogueLabel(entry.component_i18n_key, entry.component_name, t),
      disabled: fullyTaken(taken.get(entry.component.component_type_id), entry.has_position),
    }))
    .sort((left, right) => left.label.localeCompare(right.label, language));
}
