// Everything the bike is, in one place. The detail page shows the three readings that
// change; this is where the facts that do not change are read in full.
import type { ReactElement, ReactNode } from "react";
import { ActionIcon, Box, Divider, Drawer, Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import dayjs from "dayjs";
import type { Bike } from "../bikes/bikes.types";
import { bikeTitle } from "../bikes/bikeTitle";
import { useOverlayBack } from "@/hooks/useOverlayBack";
import StravaMark from "@/assets/icons/svg_icons/strava.svg?react";

// The same layer the service sheet stands on, so overlays never fight the FAB.
const SHEET_Z_INDEX = 300;

interface BikeSpecsDrawerProps {
  opened: boolean;
  onClose: () => void;
  bike: Bike;
}

export function BikeSpecsDrawer({ opened, onClose, bike }: BikeSpecsDrawerProps): ReactElement {
  const { t, i18n } = useTranslation();

  // Android's back gesture dismisses this rather than the page under it.
  useOverlayBack(opened, onClose);

  const unknown = t("addBike.summaryNotSpecified");

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="bottom"
      radius="lg"
      zIndex={SHEET_Z_INDEX}
      withCloseButton={false}
      transitionProps={{
        duration: 400,
        exitDuration: 400,
        transition: "slide-up",
        timingFunction: "cubic-bezier(0.2, 0, 0, 1)",
      }}
      overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
      styles={{
        // A spec list is as long as the bike is described, so the sheet takes the height
        // it needs and stops short of covering the page it was opened from.
        content: {
          height: "auto",
          maxHeight: "85vh",
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

      <Box
        px="md"
        pt="md"
        pb="calc(1.25rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))"
        style={{ flex: 1, minHeight: 0, overflowY: "auto" }}
      >
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Stack gap={2} style={{ minWidth: 0 }}>
              <Text fw={700} fz={22} c="text.6" lh={1.2} lineClamp={2}>
                {bikeTitle(bike)}
              </Text>
              <Text className="font-mono uppercase" fz={11} c="var(--color-text-dim)" lts="0.06em">
                {t("bikes.specsTitle")}
              </Text>
            </Stack>
            <ActionIcon variant="subtle" color="gray" radius="xl" size="lg" aria-label={t("action.close")} onClick={onClose}>
              <X size={20} color="var(--mantine-color-text-6)" />
            </ActionIcon>
          </Group>

          <Section title={t("addBike.stepSpecification")}>
            {bike.bikename !== null && bike.bikename !== "" && (
              <SpecRow label={t("addBike.bikeName")} value={bike.bikename} />
            )}
            <SpecRow label={t("addBike.category")} value={bike.bike_type ?? unknown} />
            <SpecRow label={t("addBike.year")} value={bike.year === null ? unknown : String(bike.year)} />
            <SpecRow label={t("addBike.frameSize")} value={emptyToNull(bike.bike_size) ?? unknown} />
            <SpecRow label={t("addBike.wheelSize")} value={emptyToNull(bike.wheel_size) ?? unknown} />
            <SpecRow label={t("bikes.frameMaterial")} value={emptyToNull(bike.frame_material) ?? unknown} />
            <SpecRow label={t("addBike.suspension")} value={t(suspensionKey(bike))} />
            <SpecRow
              label={t("bikes.weight")}
              value={
                bike.bike_weight_kg === null
                  ? unknown
                  : t("bikes.kilograms", {
                      // The language writes its own decimal mark - 7,25 kg, not 7.25 kg.
                      weight: new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 }).format(
                        bike.bike_weight_kg,
                      ),
                    })
              }
            />
            <SpecRow label={t("addBike.ebike")} value={bike.ebike ? t("bikes.specYes") : t("bikes.specNo")} />
          </Section>

          <Section title={t("bikes.specsTotals")}>
            <SpecRow label={t("bikes.distance")} value={t("bikes.kilometres", { count: bike.total_km ?? 0 })} />
            <SpecRow label={t("bikes.elevation")} value={t("bikes.metres", { count: bike.total_elevation_m ?? 0 })} />
            <SpecRow
              label={t("bikes.time")}
              value={t("bikes.hours", { count: Math.round((bike.total_time_min ?? 0) / 60) })}
            />
          </Section>

          {/* The link is not a spec, but it is the fact people come here to check: which
              gear on Strava this bike is, by the name it carries there. */}
          <Section title={t("strava.gearLinkingColumnGear")}>
            {bike.strava_gear_id === null ? (
              <SpecRow label={t("strava.statusTitle")} value={t("strava.notPaired")} />
            ) : (
              <SpecRow
                label={t("strava.linkedToLabel")}
                // Paired before the name was stored: say the pairing holds, never the id.
                value={bike.strava_name ?? t("strava.paired")}
                icon={
                  <StravaMark width={12} height={12} color="var(--mantine-color-strava-6)" style={{ flexShrink: 0 }} />
                }
              />
            )}
          </Section>

          {/* The owner's own words about the bike, so they keep their line breaks. */}
          {bike.description !== null && bike.description !== "" && (
            <Section title={t("bikes.description")}>
              <Text fz={14} c="text.8" style={{ whiteSpace: "pre-wrap" }}>
                {bike.description}
              </Text>
            </Section>
          )}

          {bike.created_at !== null && (
            <Text className="font-mono uppercase" fz={11} c="var(--color-text-dim)" lts="0.06em">
              {t("bikes.addedOn", { date: dayjs(bike.created_at).format("D. M. YYYY") })}
            </Text>
          )}
        </Stack>
      </Box>
    </Drawer>
  );
}

// A block of facts under its own small-caps heading, ruled off from the next.
function Section({ title, children }: { title: string; children: ReactNode }): ReactElement {
  return (
    <Stack gap="xs">
      <Text className="font-mono uppercase" fz={12} fw={600} c="var(--mantine-color-text-8)" lts="0.08em">
        {title}
      </Text>
      <Divider color="var(--mantine-color-inputs-5)" />
      <Stack gap={8}>{children}</Stack>
    </Stack>
  );
}

// One fact: what it is on the left, what it reads on the right.
function SpecRow({ label, value, icon }: { label: string; value: string; icon?: ReactNode }): ReactElement {
  return (
    <Group justify="space-between" gap="md" wrap="nowrap" align="flex-start">
      <Text fz={14} c="var(--color-text-dim)" style={{ flexShrink: 0 }}>
        {label}
      </Text>
      <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
        {icon}
        <Text className="font-mono" fz={14} c="text.6" ta="right" lineClamp={2}>
          {value}
        </Text>
      </Group>
    </Group>
  );
}

// A field the owner cleared reads the same as one they never filled in.
function emptyToNull(value: string | null): string | null {
  return value === null || value === "" ? null : value;
}

// Both ends sprung is full suspension, front alone a hardtail, neither is rigid.
function suspensionKey(bike: Bike): string {
  if (bike.has_front_suspension && bike.has_rear_suspension) return "addBike.suspensionFull";
  if (bike.has_front_suspension) return "addBike.suspensionHardtail";
  return "addBike.suspensionNone";
}
