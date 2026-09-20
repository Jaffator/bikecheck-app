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
import { ReadOnlyGauge } from "@/features/setup/ui/ReadOnlyGauge";
import type { TirePressureUnit } from "@/features/users/users.types";
import { useSeededName } from "@/i18n/useSeededName";
import { EYEBROW, PANEL } from "../../profileSurface";
import type { ProfileLeg, ProfileSetupProfile } from "../../profile.types";
import { NO_READING, gaugeReadings, type GaugeReading, type PartIcon } from "../../setupReadings";
import { UserBikeSectionTitle } from "./UserBikeSectionTitle";

const GAUGE_SIZE = 104;
const PART_ICON_SIZE = 18;

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
