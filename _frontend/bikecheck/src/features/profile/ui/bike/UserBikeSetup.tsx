// The Setup of somebody's bike as one card: it opens on the profile the bike is ridden at,
// the others a chip away; the numbers are read-only gauges - tyres in the owner's unit,
// suspension in psi (ADR 0029) - with the tokens and clicks folded under them.
import { useState, type ReactElement } from "react";
import {
  Badge,
  Box,
  Chip,
  Collapse,
  Divider,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { componentIcon } from "@/assets/icons/svg_icons/components";
import { chipStyles } from "@/features/add_bike_page/formStyles";
import { PRESSURE_DECIMALS, TYRE_PRESSURE_MAX, fromPsi, otherUnitReading } from "@/features/setup/pressure";
import { ReadOnlyGauge } from "@/features/setup/ui/ReadOnlyGauge";
import { SAG_MAX, SUSPENSION_PSI_MAX } from "@/features/setup/ui/SetupProfileForm";
import type { TirePressureUnit } from "@/features/users/users.types";
import { useSeededName, type SeededRowName } from "@/i18n/useSeededName";
import { EYEBROW, PANEL } from "../../profileSurface";
import type { ProfileLeg, ProfileMountedPart, ProfileSetupProfile } from "../../profile.types";
import { UserBikeSectionTitle } from "./UserBikeSectionTitle";

const GAUGE_SIZE = 104;
const PART_ICON_SIZE = 18;
// Suspension pressure is read to a tenth of a psi, as the sheet accepts it.
const SUSPENSION_PSI_DECIMALS = 1;
// A number the owner never wrote down.
const NO_READING = "—";

// The seeded part each gauge stands for, as the rest of the app draws it.
type PartIcon = "Tire" | "Fork" | "Shock";

// One number of the sheet as a gauge: the part over the arc, the figure already in the
// reader's unit, and under it what else may be known of the part - the tyre mounted.
interface GaugeReading {
  key: string;
  label: string;
  icon: PartIcon;
  value: number | null;
  max: number;
  figure: string;
  unit: string;
  hint?: string;
  under?: string;
}

interface UserBikeSetupProps {
  // Every profile of the bike, the active one first.
  profiles: ProfileSetupProfile[];
  unit: TirePressureUnit;
}

export function UserBikeSetup({ profiles, unit }: UserBikeSetupProps): ReactElement | null {
  const { t, i18n } = useTranslation();
  const seededName = useSeededName();
  const [selectedId, setSelectedId] = useState<number | null>(profiles[0]?.id ?? null);
  const [clicksOpen, setClicksOpen] = useState(false);

  // A profile deleted under the page falls back to the first one rather than to nothing.
  const profile = profiles.find((item) => item.id === selectedId) ?? profiles[0];
  // No saved profile is no card, not an empty one.
  if (profile === undefined) return null;

  const readings = gaugeReadings(profile, unit, i18n.language, t, seededName);
  const hasLegs = profile.fork !== null || profile.shock !== null;

  return (
    <Paper radius="lg" style={{ ...PANEL, overflow: "hidden" }}>
      <UserBikeSectionTitle
        icon={<SlidersHorizontal size={16} />}
        aside={
          profiles.length > 1 ? (
            <Box style={{ overflowX: "auto", scrollbarWidth: "none", minWidth: 0 }}>
              <Group gap={6} wrap="nowrap">
                {profiles.map((item) => (
                  <Chip
                    key={item.id}
                    size="xs"
                    radius="xl"
                    icon={false}
                    checked={item.id === profile.id}
                    onChange={() => setSelectedId(item.id)}
                    styles={chipStyles(item.id === profile.id, { wrap: false, opaque: true })}
                  >
                    {item.is_active ? `● ${item.name}` : item.name}
                  </Chip>
                ))}
              </Group>
            </Box>
          ) : undefined
        }
      >
        <Group gap={8} wrap="nowrap">
          {t("setup.title")}
          {profile.is_active && (
            <Badge size="xs" radius="sm" variant="light" color="primary.6" style={{ flexShrink: 0 }}>
              {t("sharing.bikeSetupActive")}
            </Badge>
          )}
        </Group>
      </UserBikeSectionTitle>

      <SimpleGrid cols={2} spacing="md" verticalSpacing="lg" px="md" pb="md">
        {readings.map((reading) => (
          <GaugeCell key={reading.key} reading={reading} />
        ))}
      </SimpleGrid>

      {hasLegs && (
        <>
          <UnstyledButton
            onClick={() => setClicksOpen((open) => !open)}
            px="md"
            py={12}
            w="100%"
            style={{ borderTop: "1px solid var(--color-border-subtle)", color: "var(--mantine-color-text-6)" }}
          >
            <Group justify="space-between" wrap="nowrap">
              <Text fz={13} fw={600} c="text.6">
                {t("sharing.tokensAndClicks")}
              </Text>
              {clicksOpen ? (
                <ChevronUp size={16} color="var(--color-text-dim)" />
              ) : (
                <ChevronDown size={16} color="var(--color-text-dim)" />
              )}
            </Group>
          </UnstyledButton>
          <Collapse expanded={clicksOpen}>
            <Stack gap={0} px="md" pb="sm">
              {profile.fork !== null && <ClicksRow label={legLabel(t("setup.fork"), profile.fork, t)} leg={profile.fork} />}
              {profile.fork !== null && profile.shock !== null && <Divider color="var(--color-border-subtle)" />}
              {profile.shock !== null && <ClicksRow label={legLabel(t("setup.shock"), profile.shock, t)} leg={profile.shock} />}
            </Stack>
          </Collapse>
        </>
      )}
    </Paper>
  );
}

// The part's own icon - Tire, Fork, Shock - as the rest of the app draws it.
function partMark(part: PartIcon): ReactElement | null {
  const Icon = componentIcon(part);
  return Icon === null ? null : <Icon width={PART_ICON_SIZE} height={PART_ICON_SIZE} />;
}

function GaugeCell({ reading }: { reading: GaugeReading }): ReactElement {
  return (
    <Stack gap={6} align="center" style={{ minWidth: 0 }}>
      <Group gap={6} wrap="nowrap" c="var(--color-text-dim)">
        {partMark(reading.icon)}
        <Text {...EYEBROW} lineClamp={1}>
          {reading.label}
        </Text>
      </Group>
      <ReadOnlyGauge
        value={reading.value}
        max={reading.max}
        figure={reading.figure}
        unit={reading.unit}
        hint={reading.hint}
        size={GAUGE_SIZE}
      />
      {reading.under !== undefined && (
        <Text fz={11} c="var(--color-text-dim)" lineClamp={1} ta="center" maw="100%">
          {reading.under}
        </Text>
      )}
    </Stack>
  );
}

// "Vidlice · Tokeny 2" - the leg and how many spacers it runs.
function legLabel(name: string, leg: ProfileLeg, t: (key: string) => string): string {
  return `${name} · ${t("setup.tokens")} ${leg.tokens === null ? NO_READING : String(leg.tokens)}`;
}

// The four adjusters of one leg, counted from fully closed.
function ClicksRow({ label, leg }: { label: string; leg: ProfileLeg }): ReactElement {
  const { t } = useTranslation();
  const cells: [string, number | null][] = [
    [t("sharing.lsr"), leg.clicks.rebound_ls],
    [t("sharing.hsr"), leg.clicks.rebound_hs],
    [t("sharing.lsc"), leg.clicks.compression_ls],
    [t("sharing.hsc"), leg.clicks.compression_hs],
  ];

  return (
    <Group justify="space-between" wrap="nowrap" py={6}>
      <Text fz={13} fw={600} c="text.6">
        {label}
      </Text>
      <Group gap="md" wrap="nowrap">
        {cells.map(([name, value]) => (
          <Stack key={name} gap={0} align="center">
            <Text {...EYEBROW} fz={10}>
              {name}
            </Text>
            <Text className="font-mono" fz={13} c="text.6">
              {value === null ? NO_READING : String(value)}
            </Text>
          </Stack>
        ))}
      </Group>
    </Group>
  );
}

function formatFigure(value: number, decimals: number, language: string): string {
  return new Intl.NumberFormat(language, { maximumFractionDigits: decimals }).format(value);
}

// The tyre under the pressure: what the owner called it, else what kind of part it is.
function mountedName(tyre: ProfileMountedPart, seededName: SeededRowName): string {
  const described = tyre.description?.trim();
  return described !== undefined && described !== "" ? described : seededName(tyre.type.i18n_key, tyre.type.name);
}

// A tyre reads in the owner's unit with the other unit small under it; the arc runs to the
// same ceiling the sheet's slider does.
function tyreReading(
  key: string,
  label: string,
  psi: number | null,
  tyre: ProfileMountedPart | null,
  unit: TirePressureUnit,
  language: string,
  seededName: SeededRowName,
): GaugeReading {
  const value = fromPsi(psi, unit);
  return {
    key,
    label,
    icon: "Tire",
    value: psi,
    max: TYRE_PRESSURE_MAX.psi,
    figure: value === null ? NO_READING : formatFigure(value, PRESSURE_DECIMALS[unit], language),
    unit,
    hint: value === null ? undefined : otherUnitReading(value, unit),
    under: tyre === null ? undefined : mountedName(tyre, seededName),
  };
}

// A leg is two gauges: its pressure, always psi, and its sag.
function legReadings(key: "fork" | "shock", leg: ProfileLeg, language: string, t: (key: string) => string): GaugeReading[] {
  const icon: PartIcon = key === "fork" ? "Fork" : "Shock";
  return [
    {
      key: `${key}-pressure`,
      label: key === "fork" ? t("setup.fork") : t("setup.shock"),
      icon,
      value: leg.pressure_psi,
      max: SUSPENSION_PSI_MAX,
      figure: leg.pressure_psi === null ? NO_READING : formatFigure(leg.pressure_psi, SUSPENSION_PSI_DECIMALS, language),
      unit: "psi",
    },
    {
      key: `${key}-sag`,
      label: key === "fork" ? t("sharing.gaugeForkSag") : t("sharing.gaugeShockSag"),
      icon,
      value: leg.sag_percent,
      max: SAG_MAX,
      figure: leg.sag_percent === null ? NO_READING : String(leg.sag_percent),
      unit: "%",
    },
  ];
}

// The gauges of one profile in the sheet's order: both tyres, then whichever legs the bike has.
function gaugeReadings(
  profile: ProfileSetupProfile,
  unit: TirePressureUnit,
  language: string,
  t: (key: string) => string,
  seededName: SeededRowName,
): GaugeReading[] {
  return [
    tyreReading("front-tyre", t("sharing.gaugeFrontTyre"), profile.front_tire_psi, profile.front_tire, unit, language, seededName),
    tyreReading("rear-tyre", t("sharing.gaugeRearTyre"), profile.rear_tire_psi, profile.rear_tire, unit, language, seededName),
    ...(profile.fork === null ? [] : legReadings("fork", profile.fork, language, t)),
    ...(profile.shock === null ? [] : legReadings("shock", profile.shock, language, t)),
  ];
}
