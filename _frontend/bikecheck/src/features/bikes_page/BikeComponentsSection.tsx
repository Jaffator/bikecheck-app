// What the machine is made of, read as its Component Categories. The build arrives folded:
// each category is a card that opens on its own and closes the one before it, so the whole
// build is legible at a glance and only one category is ever unrolled. The section lets the
// owner add, correct, dismount and delete a part. It still writes no maintenance of its own:
// a Replacement leaves for the service wizard, prefilled, from the part's detail sheet
// (ADR 0015, amended by ADR 0017).
import { useEffect, useRef, useState, type ReactElement, type RefObject } from "react";
import {
  ActionIcon,
  Box,
  Button,
  Collapse,
  Group,
  Paper,
  Skeleton,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { DatePickerInput, DatesProvider } from "@mantine/dates";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { ChevronDown, ChevronRight, ChevronUp, Plus, Wrench } from "lucide-react";
import { inputStyles } from "@/features/add_bike_page/formStyles";
import { groupIcon } from "@/assets/icons/svg_icons/groups";
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
import { BikeComponentDetailSheet } from "./BikeComponentDetailSheet";

// The confirm modal stands at 400, so its own calendar has to clear it.
const DISMOUNT_CALENDAR_Z_INDEX = 450;

// How many folded cards stand in for the build while it is arriving.
const SKELETON_CARDS = 3;

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
  const navigate = useNavigate();
  const { data: components, isLoading, isError } = useBikeComponents(bikeId);
  const dismount = useDismountBikeComponent();
  const remove = useDeleteBikeComponent();

  // The part being read, over the build. Null closes the sheet.
  const [viewing, setViewing] = useState<BikeComponent | null>(null);
  // Null closes the form; a part opens it as an edit, and "add" opens it empty.
  const [editing, setEditing] = useState<BikeComponent | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  // Neither is one tap away: both are asked about first.
  const [dismounting, setDismounting] = useState<BikeComponent | null>(null);
  const [deleting, setDeleting] = useState<BikeComponent | null>(null);
  // The day the part came off, which is today until the owner says otherwise — a part
  // removed last month is not recorded as coming off now.
  const [removedOn, setRemovedOn] = useState<string>(dayjs().format("YYYY-MM-DD"));
  // The one category unrolled right now. Nothing is open when the detail is first read.
  const [openCategoryId, setOpenCategoryId] = useState<number | null>(null);
  const openCardRef = useRef<HTMLDivElement>(null);

  // Opening a category near the fold would leave its parts off screen. "nearest" moves the
  // page only when it has to, so opening a card already in view does not yank it.
  useEffect(() => {
    if (openCategoryId === null) return;
    const element = openCardRef.current;
    if (element === null) return;

    const frame = window.requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [openCategoryId]);

  function toggleCategory(id: number): void {
    setOpenCategoryId((current) => (current === id ? null : id));
  }

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

  // Replacing leaves for the service wizard, which opens on the actions step with this
  // part already picked — the section itself writes no replacement (ADR 0017).
  function startReplacement(component: BikeComponent, actionId: number): void {
    const query = new URLSearchParams({
      bike: String(bikeId),
      category: String(component.component_group_id),
      action: String(actionId),
      component: String(component.id),
    });
    navigate(`/service/new?${query.toString()}`);
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
          already on screen while this is still arriving. It arrives as the folded cards it
          will settle into. */}
      {isLoading &&
        Array.from({ length: SKELETON_CARDS }, (_, index) => <Skeleton key={index} h={60} radius="lg" />)}

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
          open={openCategoryId === category.id}
          onToggle={() => toggleCategory(category.id)}
          cardRef={openCategoryId === category.id ? openCardRef : undefined}
          onOpen={setViewing}
        />
      ))}

      {(dismount.isError || remove.isError) && (
        <Text fz={13} c="red.5">
          {t("bikeComponents.actionFailed")}
        </Text>
      )}

      <BikeComponentDetailSheet
        component={viewing}
        bikeId={bikeId}
        onClose={() => setViewing(null)}
        onEdit={openEdit}
        onDismount={askToDismount}
        onDelete={setDeleting}
        onReplace={startReplacement}
      />

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
            // The part just left the build, so the sheet reading it goes with it.
            {
              onSuccess: () => {
                setDismounting(null);
                setViewing(null);
              },
            },
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
          remove.mutate(
            { id: deleting.id, bikeId },
            {
              onSuccess: () => {
                setDeleting(null);
                setViewing(null);
              },
            },
          );
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

// The category mark, drawn the way an action tile draws its own: bare, taking its colour
// from the box around it — grey while the card is closed, brand while it is open. A
// category the app has no drawing for falls back to a wrench.
function categoryIcon(groupName: string): ReactElement {
  const Icon = groupIcon(groupName);
  if (Icon === null) return <Wrench size={22} />;
  return <Icon width={26} height={26} />;
}

// One Component Category as a card: closed, it is the name and how much of the build sits
// in it; open, it is the parts themselves, with what has come off folded away below them.
// The build is what the section is for, so the history does not crowd it.
function Category({
  category,
  open,
  onToggle,
  cardRef,
  onOpen,
}: {
  category: ComponentCategory;
  open: boolean;
  onToggle: () => void;
  cardRef?: RefObject<HTMLDivElement | null>;
  onOpen: (component: BikeComponent) => void;
}): ReactElement {
  const { t } = useTranslation();
  const [showDismounted, setShowDismounted] = useState(false);

  // A category with nothing fitted still holds the bike's history, so it counts what came
  // off rather than reading as an empty zero.
  const countLabel =
    category.mounted.length === 0
      ? t("bikeComponents.dismountedCount", { count: category.dismounted.length })
      : t("bikeComponents.partsCount", { count: category.mounted.length });

  return (
    <Paper
      ref={cardRef}
      radius="lg"
      // A closed card is itself one button, so it presses like an action tile does. An open
      // one carries the parts' own menus, so it stops pressing — see docs/ui/card-surface.md.
      className={open ? undefined : "active:scale-[0.985]"}
      style={{
        backgroundColor: "var(--mantine-color-cards-6)",
        backgroundImage: "var(--card-glow)",
        border: open ? "1px solid var(--mantine-color-primary-9)" : "1px solid var(--color-border-subtle)",
        boxShadow: "var(--elev-row)",
        overflow: "hidden",
        transition: "transform 120ms ease",
      }}
    >
      <UnstyledButton
        onClick={onToggle}
        aria-expanded={open}
        style={{ display: "block", width: "100%", padding: "var(--mantine-spacing-md)", cursor: "pointer" }}
      >
        <Group justify="space-between" wrap="nowrap" gap="sm">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            {/* The mark only lights up for the category being read; the rest stay quiet. */}
            <Box
              style={{
                display: "flex",
                flexShrink: 0,
                color: open ? "var(--mantine-color-primary-6)" : "var(--mantine-color-text-8)",
              }}
            >
              {categoryIcon(category.groupName)}
            </Box>
            <Text fz={16} fw={600} c="text.6" lineClamp={1}>
              {category.name}
            </Text>
          </Group>
          <Group gap={8} wrap="nowrap" style={{ flexShrink: 0 }}>
            <Text className="font-mono" fz={11} fw={400} tt="uppercase" lts="0.08em" c="var(--color-text-dim)">
              {countLabel}
            </Text>
            {open ? (
              <ChevronUp size={16} color="var(--color-text-dim)" />
            ) : (
              <ChevronRight size={16} color="var(--color-text-dim)" />
            )}
          </Group>
        </Group>
      </UnstyledButton>

      {open && (
        <Stack gap={0}>
          {category.mounted.map((component) => (
            <BikeComponentRow key={component.id} component={component} onOpen={onOpen} />
          ))}

          {category.dismounted.length > 0 && (
            <>
              <UnstyledButton
                onClick={() => setShowDismounted((shown) => !shown)}
                px="md"
                py={10}
                style={{ borderTop: "1px solid var(--color-border-subtle)" }}
              >
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
                {category.dismounted.map((component) => (
                  <BikeComponentRow key={component.id} component={component} readOnly onOpen={onOpen} />
                ))}
              </Collapse>
            </>
          )}
        </Stack>
      )}
    </Paper>
  );
}
