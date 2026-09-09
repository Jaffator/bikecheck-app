// One Mounted Component in full, over the build it was opened from. Reading a part and
// deciding what to do to it stay separate (ADR 0018) with one exception: correcting what
// you are looking at. The sheet carries Edit and nothing else — Replace, Dismount and
// Delete stay on the row's kebab (ADR 0023).
import { useState, type ReactElement, type ReactNode } from "react";
import { ActionIcon, Box, Divider, Drawer, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { Info, Pencil, X } from "lucide-react";
import type { TFunction } from "i18next";
import type { BikeComponent } from "../components.types";
import {
  componentTypeName,
  isDismounted,
  positionLabel,
  tracksDrivetrain,
  tracksSuspension,
} from "../componentLabels";
import { useOverlayBack } from "@/hooks/useOverlayBack";
import { ExplanationModal } from "@/components/ExplanationModal";
import { QUIET_COLOR } from "@/features/service_tracking/attentionLevel";

// Half the screen, fixed rather than content-sized, so the sheet does not jump in height
// between parts and the build it was opened from stays visible behind it.
const SHEET_HEIGHT = "70vh";

// Above the section, below the form the sheet opens and the confirmations that form raises.
const SHEET_Z_INDEX = 300;


interface BikeComponentDetailSheetProps {
  // Null closes the sheet.
  component: BikeComponent | null;
  onClose: () => void;
  // Opens the form over the sheet. A part that has come off the bike is a record rather
  // than a build item, so it is never offered this.
  // Absent on an Archived Bike: the part is a record there, not something to correct.
  onEdit?: (component: BikeComponent) => void;
}

export function BikeComponentDetailSheet({ component, onClose, onEdit }: BikeComponentDetailSheetProps): ReactElement {
  // The sheet is still on screen while it slides out, so what it was last showing stays
  // drawn all the way down instead of emptying mid-animation.
  const shown = useLastShown(component);

  // Android's back gesture dismisses this rather than the page under it.
  useOverlayBack(component !== null, onClose);

  const removed = shown !== null && isDismounted(shown);

  return (
    <Drawer
      opened={component !== null}
      onClose={onClose}
      position="bottom"
      radius="lg"
      zIndex={SHEET_Z_INDEX}
      withCloseButton={false}
      overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
      styles={{
        content: {
          height: SHEET_HEIGHT,
          backgroundColor: "var(--mantine-color-cards-6)",
          display: "flex",
          flexDirection: "column",
        },
        body: { flex: 1, minHeight: 0, padding: 0, display: "flex", flexDirection: "column" },
      }}
    >
      {/* Says "floating layer" and nothing more: the sheet does not answer to a drag. */}
      <Box
        mx="auto"
        mt="xs"
        w={36}
        h={4}
        style={{ borderRadius: 9999, backgroundColor: "var(--color-border-subtle)", flexShrink: 0 }}
      />

      <Box px="md" pt="md" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {shown !== null && (
          <Stack gap="lg" pb="md">
            <Header
              component={shown}
              removed={removed}
              onClose={onClose}
              onEdit={removed || onEdit === undefined ? undefined : () => onEdit(shown)}
            />
            <Wear component={shown} />
            <Record component={shown} removed={removed} />
          </Stack>
        )}
      </Box>
    </Drawer>
  );
}

// What the part is, what the owner called it, and where it stands. The two things reachable
// from here sit opposite the name: close, and correct.
function Header({
  component,
  removed,
  onClose,
  onEdit,
}: {
  component: BikeComponent;
  removed: boolean;
  onClose: () => void;
  // Absent on a part that has come off the bike.
  onEdit?: () => void;
}): ReactElement {
  const { t } = useTranslation();
  const position = positionLabel(component.position, t);
  const described = component.component_desc?.trim();

  return (
    <Stack gap="sm">
      <Group justify="space-between" wrap="nowrap" align="flex-start" gap="sm">
        <Group gap="sm" wrap="nowrap" align="flex-start" style={{ minWidth: 0, flex: 1 }}>
          <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
            {/* The correction sits on the name it corrects, not out at the edge with the
                close button. */}
            <Group gap={6} wrap="nowrap" align="center">
              <Text fz={20} fw={700} c="text.6" lineClamp={2}>
                {t("bikeComponents.detailTitle", { type: componentTypeName(component, t) })}
              </Text>
              {onEdit !== undefined && (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  radius="xl"
                  size="md"
                  aria-label={t("bikeComponents.edit")}
                  onClick={onEdit}
                  style={{ flexShrink: 0 }}
                >
                  <Pencil size={17} color="var(--color-text-dim)" />
                </ActionIcon>
              )}
            </Group>
            {described !== undefined && described !== "" && (
              <Text fz={14} c="text.8" lineClamp={2}>
                {described}
              </Text>
            )}
          </Stack>
        </Group>

        <Group gap={5} wrap="nowrap" style={{ flexShrink: 0 }}>
          <ActionIcon variant="subtle" color="gray" radius="xl" size="md" aria-label={t("action.close")} onClick={onClose}>
            <X size={18} color="var(--color-text-dim)" />
          </ActionIcon>
        </Group>
      </Group>

      {/* On the bike or off it, and which side it holds. A part recorded without a side
          says nothing rather than saying "none". */}
      <Group gap="lg" wrap="wrap">
        <Group gap={8} wrap="nowrap">
          <Box
            w={8}
            h={8}
            style={{
              borderRadius: "50%",
              backgroundColor: removed ? "var(--color-muted)" : QUIET_COLOR,
              flexShrink: 0,
            }}
          />
          <Text className="font-mono" fz={12} c="text.7">
            {t(removed ? "bikeComponents.stateDismounted" : "bikeComponents.stateActive")}
          </Text>
        </Group>
        {position !== null && (
          <Text className="font-mono" fz={12} c="var(--color-text-dim)">
            {t("bikeComponents.detailPositionValue", { position })}
          </Text>
        )}
      </Group>
    </Stack>
  );
}

// What the ride analysis has added up against this part. Distance and time are kept on
// every part; the rest only where something feeds them, and each is shown from the first
// ride rather than once it passes zero.
function Wear({ component }: { component: BikeComponent }): ReactElement {
  const { t, i18n } = useTranslation();

  // The reading the info button is explaining right now. Null while none is.
  const [explained, setExplained] = useState<Tile | null>(null);

  const tiles: Tile[] = [
    { label: t("bikeComponents.detailTime"), value: hours(component.total_time_min, i18n.language) },
    { label: t("bikeComponents.detailDistance"), value: kilometres(component.total_km, i18n.language) },
  ];

  // Distance and time are what the odometer says; these two are what the ride analysis
  // made of the terrain, which no owner can be expected to guess. They say so themselves.
  if (tracksDrivetrain(component)) {
    tiles.push({
      label: t("bikeComponents.detailDrivetrain"),
      value: kilometres(component.drivetrain_km, i18n.language),
      explanation: t("bikeComponents.detailDrivetrainInfo"),
    });
  }

  if (tracksSuspension(component)) {
    tiles.push({
      label: t("bikeComponents.detailSuspension"),
      value: hours(component.suspension_min, i18n.language),
      explanation: t("bikeComponents.detailSuspensionInfo"),
    });
  }

  // Not a score out of a hundred but an accumulator like the others, and shown only where
  // the bike's own service intervals watch one. Decided by the server, never re-derived
  // here (ADR 0023).
  if (component.tracks_health_index) {
    tiles.push({
      label: t("bikeComponents.detailHealthIndex"),
      value: figure(component.health_index, i18n.language),
      explanation: t("bikeComponents.detailHealthIndexInfo"),
    });
  }

  return (
    <>
      <SimpleGrid cols={2} spacing="md" verticalSpacing="lg">
        {tiles.map((tile) => (
          <Stack key={tile.label} gap={4}>
            <Group gap={4} wrap="nowrap" align="center">
              <Text className="font-mono" fz={11} fw={400} tt="uppercase" lts="0.08em" c="var(--color-text-dim)">
                {tile.label}
              </Text>
              {tile.explanation !== undefined && (
                <ActionIcon
                  variant="transparent"
                  color="gray"
                  size="xs"
                  aria-label={t("bikeComponents.detailInfo", { reading: tile.label })}
                  onClick={() => setExplained(tile)}
                  style={{ flexShrink: 0 }}
                >
                  <Info size={13} color="var(--color-text-dim)" />
                </ActionIcon>
              )}
            </Group>
            <Text className="font-mono" fz={18} fw={100} c="text.6" lh={1.1}>
              {tile.value}
            </Text>
          </Stack>
        ))}
      </SimpleGrid>

      <ExplanationModal
        explained={explained === null ? null : { title: explained.label, body: explained.explanation ?? "" }}
        onClose={() => setExplained(null)}
      />
    </>
  );
}

// One reading in the grid. An explanation is carried only by the two the ride analysis
// derives, which is what earns them the info button.
interface Tile {
  label: string;
  value: string;
  explanation?: string;
}


// The dates the part carries, and whatever the owner wrote on it. Facts rather than
// readings, so they keep the row shape the tiles took over from.
function Record({ component, removed }: { component: BikeComponent; removed: boolean }): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack gap={0}>
      <Divider color="var(--mantine-color-inputs-5)" />

      <Reading label={t("bikeComponents.detailMounted")} value={dayLabel(component.mounted_at)} />
      {removed && <Reading label={t("bikeComponents.detailRemoved")} value={dayLabel(component.removed_at)} />}
      <Reading label={t("bikeComponents.detailLastService")} value={serviceLabel(component, t)} />

      {component.note !== null && component.note.trim() !== "" && (
        <Reading label={t("bikeComponents.detailNote")} value={component.note} wrap />
      )}
    </Stack>
  );
}

// One label and its value, in the two faces the card type scale gives them.
function Reading({ label, value, wrap = false }: { label: string; value: ReactNode; wrap?: boolean }): ReactElement {
  return (
    <>
      <Group justify="space-between" wrap="nowrap" gap="md" py={12} align="flex-start">
        <Text
          className="font-mono"
          fz={11}
          fw={400}
          tt="uppercase"
          lts="0.08em"
          c="var(--color-text-dim)"
          style={{ flexShrink: 0 }}
        >
          {label}
        </Text>
        <Text
          className={wrap ? undefined : "font-mono"}
          fz={13}
          c="text.7"
          ta="right"
          style={wrap ? { whiteSpace: "pre-wrap" } : undefined}
        >
          {value}
        </Text>
      </Group>
      <Divider color="var(--mantine-color-inputs-5)" />
    </>
  );
}

// A tile is read at a glance, so its thousands are grouped the way the owner's language
// writes them. A reading with nothing on record yet is a zero, not a gap.
function figure(value: number | null, language: string): string {
  return new Intl.NumberFormat(language).format(value ?? 0);
}

// The two units the app writes everywhere else, the report included.
function kilometres(value: number | null, language: string): string {
  return `${figure(value, language)} km`;
}

function hours(minutes: number | null, language: string): string {
  return `${figure(Math.round((minutes ?? 0) / 60), language)} h`;
}

// A day the app may not have on record, which reads as a dash rather than as today.
function dayLabel(day: string | null): string {
  if (day === null) return "—";
  return dayjs(day).format("D. M. YYYY");
}

// A part nobody has serviced says so, rather than showing a blank to be read as an error.
function serviceLabel(component: BikeComponent, t: TFunction): string {
  if (component.last_service_at === null) return t("bikeComponents.neverServiced");
  return dayjs(component.last_service_at).format("D. M. YYYY");
}

// Holds the last part the sheet was given, so closing it animates out with its content.
function useLastShown(component: BikeComponent | null): BikeComponent | null {
  const [last, setLast] = useState<BikeComponent | null>(null);
  if (component !== null && component !== last) setLast(component);
  return component ?? last;
}
