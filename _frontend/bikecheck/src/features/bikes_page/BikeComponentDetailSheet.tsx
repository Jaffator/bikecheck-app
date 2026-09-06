// One Mounted Component in full, over the build it was opened from. Everything the row
// had no room for is read here, and nothing more: the four things that can be done to the
// part live on its row's kebab, so the sheet is purely a read (ADR 0018).
import { useState, type ReactElement, type ReactNode } from "react";
import { ActionIcon, Box, Divider, Drawer, Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { X } from "lucide-react";
import type { TFunction } from "i18next";
import type { BikeComponent } from "@/features/components/components.types";
import { componentTypeName, isDismounted, positionLabel } from "@/features/components/componentLabels";
import { useOverlayBack } from "@/hooks/useOverlayBack";

// Half the screen, fixed rather than content-sized, so the sheet does not jump in height
// between parts and the build it was opened from stays visible behind it.
const SHEET_HEIGHT = "50vh";

// Above the section, below the form the sheet opens and the confirmations that form raises.
const SHEET_Z_INDEX = 300;

interface BikeComponentDetailSheetProps {
  // Null closes the sheet.
  component: BikeComponent | null;
  onClose: () => void;
}

export function BikeComponentDetailSheet({ component, onClose }: BikeComponentDetailSheetProps): ReactElement {
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
            <Header component={shown} onClose={onClose} />
            <Readings component={shown} removed={removed} />
          </Stack>
        )}
      </Box>

    </Drawer>
  );
}

// What the part is, and what the owner called it.
function Header({ component, onClose }: { component: BikeComponent; onClose: () => void }): ReactElement {
  const { t } = useTranslation();
  const position = positionLabel(component.position, t);
  const described = component.component_desc?.trim();

  return (
    <Group justify="space-between" wrap="nowrap" align="flex-start" gap="sm">
      <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
        <Group gap={8} wrap="nowrap">
          <Text fz={20} fw={700} c="text.6" lineClamp={2}>
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
        {described !== undefined && described !== "" && (
          <Text fz={14} c="text.8">
            {described}
          </Text>
        )}
      </Stack>

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
  );
}

// Everything the read carries about the part. A reading the part has nothing on record for
// is left out rather than shown as a zero — except the service, which says so in words.
function Readings({ component, removed }: { component: BikeComponent; removed: boolean }): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack gap={0}>
      <Divider color="var(--mantine-color-inputs-5)" />

      {component.total_km !== null && component.total_km > 0 && (
        <Reading
          label={t("bikeComponents.detailDistance")}
          value={t("bikes.kilometres", { count: component.total_km })}
        />
      )}
      {component.total_time_min !== null && component.total_time_min > 0 && (
        <Reading
          label={t("bikeComponents.detailTime")}
          value={t("bikes.hours", { count: Math.round(component.total_time_min / 60) })}
        />
      )}
      {component.drivetrain_km !== null && component.drivetrain_km > 0 && (
        <Reading
          label={t("bikeComponents.detailDrivetrain")}
          value={t("bikes.kilometres", { count: component.drivetrain_km })}
        />
      )}
      {component.suspension_min !== null && component.suspension_min > 0 && (
        <Reading
          label={t("bikeComponents.detailSuspension")}
          value={t("bikes.hours", { count: Math.round(component.suspension_min / 60) })}
        />
      )}
      {/* An accumulator like the others, not a score out of a hundred: it is what the ride
          analysis has added up against this part. */}
      {component.health_index !== null && component.health_index > 0 && (
        <Reading label={t("bikeComponents.detailHealthIndex")} value={String(component.health_index)} />
      )}

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
