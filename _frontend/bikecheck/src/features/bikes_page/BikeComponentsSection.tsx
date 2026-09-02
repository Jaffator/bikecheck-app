// What the machine is made of, read as its Component Categories. The section shows the
// build and lets the owner add, correct, dismount and delete a part — and deliberately
// nothing more: replacing a part happens in the service wizard, reached from the action
// tiles above (ADR 0015).
import { useState, type ReactElement } from "react";
import { ActionIcon, Button, Collapse, Group, Skeleton, Stack, Text, UnstyledButton } from "@mantine/core";
import { DatePickerInput, DatesProvider } from "@mantine/dates";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { inputStyles } from "@/features/add_bike_page/formStyles";
import { ConfirmModal } from "@/components/ConfirmModal";
import {
  useBikeComponents,
  useDeleteBikeComponent,
  useDismountBikeComponent,
} from "@/features/components/components.queries";
import type { BikeComponent } from "@/features/components/components.types";
import { groupByCategory, type ComponentCategory } from "@/features/components/componentLabels";
import { BikeComponentRow } from "./BikeComponentRow";
import { BikeComponentFormDrawer } from "./BikeComponentFormDrawer";

// The confirm modal stands at 400, so its own calendar has to clear it.
const DISMOUNT_CALENDAR_Z_INDEX = 450;

// A day, sent as the instant the backend reads back as that day.
function toIsoDate(day: string): string {
  return new Date(`${day}T00:00:00.000Z`).toISOString();
}

interface BikeComponentsSectionProps {
  bikeId: number;
  // Which catalogue the add flow offers.
  ebike: boolean;
}

export function BikeComponentsSection({ bikeId, ebike }: BikeComponentsSectionProps): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: components, isLoading, isError } = useBikeComponents(bikeId);
  const dismount = useDismountBikeComponent();
  const remove = useDeleteBikeComponent();

  // Null closes the form; a part opens it as an edit, and "add" opens it empty.
  const [editing, setEditing] = useState<BikeComponent | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  // Neither is one tap away: both are asked about first.
  const [dismounting, setDismounting] = useState<BikeComponent | null>(null);
  const [deleting, setDeleting] = useState<BikeComponent | null>(null);
  // The day the part came off, which is today until the owner says otherwise — a part
  // removed last month is not recorded as coming off now.
  const [removedOn, setRemovedOn] = useState<string>(dayjs().format("YYYY-MM-DD"));

  function askToDismount(component: BikeComponent): void {
    setRemovedOn(dayjs().format("YYYY-MM-DD"));
    setDismounting(component);
  }

  function openAdd(): void {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(component: BikeComponent): void {
    setEditing(component);
    setFormOpen(true);
  }

  const categories = groupByCategory(components ?? [], t);

  return (
    <Stack gap="sm">
      <Group justify="space-between" wrap="nowrap">
        <Text className="font-mono" fz={11} fw={400} tt="uppercase" lts="0.08em" c="var(--color-text-dim)">
          {t("bikeComponents.title")}
        </Text>
        <ActionIcon
          variant="subtle"
          radius="xl"
          size="md"
          color="primary.6"
          aria-label={t("bikeComponents.addTitle")}
          onClick={openAdd}
        >
          <Plus size={18} />
        </ActionIcon>
      </Group>

      {/* The section stands on its own request, so the photo and the readings above it are
          already on screen while this is still arriving. */}
      {isLoading && <Skeleton h={72} radius="md" />}

      {isError && (
        <Text fz={13} c="red.5">
          {t("bikeComponents.loadFailed")}
        </Text>
      )}

      {!isLoading && !isError && categories.length === 0 && (
        <Stack gap="sm" align="flex-start">
          <Text fz={13} c="var(--color-text-dim)">
            {t("bikeComponents.emptyBody")}
          </Text>
          <Button variant="light" color="primary.6" radius="md" leftSection={<Plus size={16} />} onClick={openAdd}>
            {t("bikeComponents.addTitle")}
          </Button>
        </Stack>
      )}

      {categories.map((category) => (
        <Category
          key={category.id}
          category={category}
          onEdit={openEdit}
          onDismount={askToDismount}
          onDelete={setDeleting}
        />
      ))}

      {(dismount.isError || remove.isError) && (
        <Text fz={13} c="red.5">
          {t("bikeComponents.actionFailed")}
        </Text>
      )}

      <BikeComponentFormDrawer
        opened={formOpen}
        onClose={() => setFormOpen(false)}
        bikeId={bikeId}
        ebike={ebike}
        component={editing}
      />

      {/* Dismounting keeps everything the part did, which the question is the only place
          with room to say — and the only place the owner can date the removal. */}
      <ConfirmModal
        opened={dismounting !== null}
        onCancel={() => setDismounting(null)}
        onConfirm={() => {
          if (dismounting === null) return;
          dismount.mutate(
            { id: dismounting.id, bikeId, removed_at: toIsoDate(removedOn) },
            { onSuccess: () => setDismounting(null) },
          );
        }}
        title={t("bikeComponents.dismountConfirmTitle")}
        body={t("bikeComponents.dismountConfirmBody")}
        cancelLabel={t("bikeComponents.confirmCancel")}
        confirmLabel={t("bikeComponents.dismount")}
        pending={dismount.isPending}
      >
        <DatesProvider settings={{ locale: i18n.language.split("-")[0] }}>
          <DatePickerInput
            label={t("bikeComponents.removedLabel")}
            value={removedOn}
            onChange={(value) => setRemovedOn(value ?? dayjs().format("YYYY-MM-DD"))}
            // A part cannot have come off after today.
            maxDate={dayjs().format("YYYY-MM-DD")}
            styles={inputStyles}
            popoverProps={{
              zIndex: DISMOUNT_CALENDAR_Z_INDEX,
              styles: {
                dropdown: {
                  backgroundColor: "var(--mantine-color-cards-6)",
                  border: "1px solid var(--mantine-color-inputs-5)",
                },
              },
            }}
          />
        </DatesProvider>
      </ConfirmModal>

      <ConfirmModal
        opened={deleting !== null}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting === null) return;
          remove.mutate({ id: deleting.id, bikeId }, { onSuccess: () => setDeleting(null) });
        }}
        title={t("bikeComponents.deleteConfirmTitle")}
        body={t("bikeComponents.deleteConfirmBody")}
        cancelLabel={t("bikeComponents.confirmCancel")}
        confirmLabel={t("bikeComponents.delete")}
        pending={remove.isPending}
      />
    </Stack>
  );
}

// One Component Category: what is on the bike now, and — folded away below it — what has
// come off. The build is what the section is for, so the history does not crowd it.
function Category({
  category,
  onEdit,
  onDismount,
  onDelete,
}: {
  category: ComponentCategory;
  onEdit: (component: BikeComponent) => void;
  onDismount: (component: BikeComponent) => void;
  onDelete: (component: BikeComponent) => void;
}): ReactElement {
  const { t } = useTranslation();
  const [showDismounted, setShowDismounted] = useState(false);

  return (
    <Stack gap={6} mt={4}>
      <Text fz={13} fw={600} c="text.7">
        {category.name}
      </Text>

      {category.mounted.map((component) => (
        <BikeComponentRow
          key={component.id}
          component={component}
          onEdit={onEdit}
          onDismount={onDismount}
          onDelete={onDelete}
        />
      ))}

      {category.dismounted.length > 0 && (
        <>
          <UnstyledButton onClick={() => setShowDismounted((open) => !open)} py={4}>
            <Group gap={4} wrap="nowrap">
              {showDismounted ? (
                <ChevronDown size={14} color="var(--color-text-dim)" />
              ) : (
                <ChevronRight size={14} color="var(--color-text-dim)" />
              )}
              <Text className="font-mono" fz={11} fw={400} tt="uppercase" lts="0.08em" c="var(--color-text-dim)">
                {t("bikeComponents.dismountedCount", { count: category.dismounted.length })}
              </Text>
            </Group>
          </UnstyledButton>

          <Collapse expanded={showDismounted}>
            <Stack gap={6}>
              {category.dismounted.map((component) => (
                <BikeComponentRow
                  key={component.id}
                  component={component}
                  readOnly
                  onEdit={onEdit}
                  onDismount={onDismount}
                  onDelete={onDelete}
                />
              ))}
            </Stack>
          </Collapse>
        </>
      )}
    </Stack>
  );
}
