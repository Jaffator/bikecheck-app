// PROTOTYPE (#165) — throwaway. Three desktop layouts of one bike on `/bikes/:id`, switched by `?variant=`.
import { useState, type ReactElement, type ReactNode } from "react";
import {
  ActionIcon,
  Box,
  Divider,
  Grid,
  Group,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Archive, ArrowRight, ArrowUpRight, ChevronRight, Clock, Gauge, Info, Share2 } from "lucide-react";
import { PrototypeSwitcher } from "@/components/PrototypeSwitcher";
import { usePrototypeVariant, type PrototypeVariant } from "@/components/prototypeVariant";
import type { Bike } from "@/features/bikes/bikes.types";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { BikePhoto } from "@/features/bikes/ui/BikePhoto";
import { BikeActionTiles } from "@/features/bikes/ui/BikeActionTiles";
import { BikeComponentsSection } from "@/features/components/ui/BikeComponentsSection";
import { useRecentServices } from "@/features/service/service.queries";
import { ServiceList } from "@/features/service/ui/ServiceList";
import type { TrackedAction } from "@/features/service_tracking/tracking.types";
import { HealthBadge } from "@/features/service_tracking/ui/HealthBadge";
import { TrackedActionsSection } from "@/features/service_tracking/ui/TrackedActionsSection";
import { useConnectStrava } from "@/features/strava/strava.queries";
import { BikeStravaCard } from "@/features/strava/ui/BikeStravaCard";
import { StravaLinkedBadge } from "@/features/strava/ui/StravaLinkedBadge";
import { useCurrentUser } from "@/features/users/users.queries";

const BIKE_VARIANTS: PrototypeVariant[] = [
  { key: "A", name: "Two columns (baseline)" },
  { key: "B", name: "Banner + three columns" },
  { key: "C", name: "Sticky rail + tabs" },
];

const CARD = {
  backgroundColor: "var(--mantine-color-cards-6)",
  backgroundImage: "var(--card-glow)",
  border: "none",
  overflow: "hidden",
} as const;

// The rail holds under the desktop header while the tabs scroll.
const RAIL_TOP = "calc(3rem + var(--mantine-spacing-md))";
const RAIL_WIDTH = 340;

interface BikeDetailPrototypeProps {
  bike: Bike;
  trackedActions: TrackedAction[];
  archived: boolean;
  paired: boolean;
  onOpenSpecs: () => void;
  onExport: () => void;
  onPairGear: () => void;
}

export function BikeDetailPrototype(props: BikeDetailPrototypeProps): ReactElement {
  const variant = usePrototypeVariant(BIKE_VARIANTS);

  return (
    <>
      {variant === "A" && <TwoColumns {...props} />}
      {variant === "B" && <BannerThreeColumns {...props} />}
      {variant === "C" && <RailTabs {...props} />}
      <PrototypeSwitcher variants={BIKE_VARIANTS} />
    </>
  );
}

// A — photo, specs and health on the left; the build and its history on the right.
function TwoColumns(props: BikeDetailPrototypeProps): ReactElement {
  const { bike, archived } = props;

  return (
    <Grid gap="lg" align="flex-start">
      <Grid.Col span={5}>
        <Stack gap="md">
          <HeroCard {...props} />
          <Leftovers {...props} />
          <Tiles bike={bike} archived={archived} cols={2} />
          <TrackedActionsSection bikeId={bike.id} />
        </Stack>
      </Grid.Col>
      <Grid.Col span={7}>
        <Stack gap="md">
          <BikeComponentsSection bikeId={bike.id} ebike={bike.ebike} readOnly={archived} />
          <RecentHistory bikeId={bike.id} />
        </Stack>
      </Grid.Col>
    </Grid>
  );
}

// B — a banner (photo beside name, figures and specs), the acts in one row, then three equal columns.
function BannerThreeColumns(props: BikeDetailPrototypeProps): ReactElement {
  const { bike, trackedActions, archived, onOpenSpecs, onExport } = props;

  return (
    <Stack gap="lg">
      <Paper radius="lg" style={{ ...CARD, boxShadow: "var(--elev-hero)" }}>
        <Grid gap={0} align="stretch">
          <Grid.Col span={6}>
            <Photo bike={bike} trackedActions={trackedActions} />
          </Grid.Col>
          <Grid.Col span={6}>
            <Stack gap="md" p="lg">
              <NameBlock bike={bike} onExport={onExport} />
              <Divider color="var(--color-border-subtle)" />
              <SpecGrid bike={bike} cols={2} />
              <AllSpecsLink onOpenSpecs={onOpenSpecs} />
            </Stack>
          </Grid.Col>
        </Grid>
      </Paper>
      <Leftovers {...props} />
      <Tiles bike={bike} archived={archived} cols={4} />
      <SimpleGrid cols={3} spacing="lg" style={{ alignItems: "start" }}>
        <TrackedActionsSection bikeId={bike.id} />
        <BikeComponentsSection bikeId={bike.id} ebike={bike.ebike} readOnly={archived} />
        <RecentHistory bikeId={bike.id} />
      </SimpleGrid>
    </Stack>
  );
}

type Tab = "health" | "build" | "history";

// C — the bike stays put in a rail on the left; the right reads one thing at a time.
function RailTabs(props: BikeDetailPrototypeProps): ReactElement {
  const { t } = useTranslation();
  const { bike, trackedActions, archived, onOpenSpecs, onExport } = props;
  const [tab, setTab] = useState<Tab>("health");

  return (
    <Group gap="lg" align="flex-start" wrap="nowrap">
      <Box w={RAIL_WIDTH} style={{ flexShrink: 0, position: "sticky", top: RAIL_TOP }}>
        <Stack gap="md">
          <Paper radius="lg" style={{ ...CARD, boxShadow: "var(--elev-hero)" }}>
            <Photo bike={bike} trackedActions={trackedActions} />
            <Stack gap="md" p="md">
              <NameBlock bike={bike} onExport={onExport} />
              <Divider color="var(--color-border-subtle)" />
              <SpecGrid bike={bike} cols={1} />
              <AllSpecsLink onOpenSpecs={onOpenSpecs} />
            </Stack>
          </Paper>
          <Tiles bike={bike} archived={archived} cols={1} />
        </Stack>
      </Box>

      <Stack gap="md" style={{ flex: 1, minWidth: 0 }}>
        <Leftovers {...props} />
        <SegmentedControl
          value={tab}
          onChange={(value) => setTab(value as Tab)}
          radius="md"
          data={[
            { value: "health", label: t("tracking.title") },
            { value: "build", label: t("bikeComponents.title") },
            { value: "history", label: t("service.recentTitle") },
          ]}
          style={{ alignSelf: "flex-start" }}
        />
        {tab === "health" && <TrackedActionsSection bikeId={bike.id} />}
        {tab === "build" && <BikeComponentsSection bikeId={bike.id} ebike={bike.ebike} readOnly={archived} />}
        {tab === "history" && <RecentHistory bikeId={bike.id} />}
      </Stack>
    </Group>
  );
}

// ---------- pieces the variants arrange ----------

// The phone's hero card, as is.
function HeroCard({ bike, trackedActions, onOpenSpecs, onExport }: BikeDetailPrototypeProps): ReactElement {
  return (
    <Paper radius="lg" style={{ ...CARD, boxShadow: "var(--elev-hero)" }}>
      <Photo bike={bike} trackedActions={trackedActions} />
      <Box p="md">
        <NameBlock bike={bike} onExport={onExport} />
      </Box>
      <Box style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
        <AllSpecsLink onOpenSpecs={onOpenSpecs} padded />
      </Box>
    </Paper>
  );
}

function Photo({ bike, trackedActions }: { bike: Bike; trackedActions: TrackedAction[] }): ReactElement {
  return (
    <BikePhoto imageUrl={bike.image_url} title={bikeTitle(bike)} subtitle={null} titleSize={24} showCaption={false}>
      <Stack gap={6} align="flex-end">
        <HealthBadge actions={trackedActions} />
        <StravaLinkedBadge stravaGearId={bike.strava_gear_id} />
      </Stack>
    </BikePhoto>
  );
}

function NameBlock({ bike, onExport }: { bike: Bike; onExport: () => void }): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack gap={8}>
      <Group gap="sm" wrap="nowrap" align="flex-start" justify="space-between">
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Text fw={700} fz={24} c="text.6" lh={1.2} lineClamp={2}>
            {bikeTitle(bike)}
          </Text>
          {bike.bikename !== null && bike.bikename !== "" && (
            <Text className="font-mono" fz={11} tt="uppercase" c="var(--color-text-dim)" lineClamp={1}>
              {bike.bikename}
            </Text>
          )}
        </Stack>
        <ActionIcon
          variant="transparent"
          radius="xl"
          size="lg"
          aria-label={t("report.exportBikeCheck")}
          onClick={onExport}
          style={{ flexShrink: 0 }}
        >
          <Share2 size={20} color="var(--mantine-color-primary-6)" />
        </ActionIcon>
      </Group>
      <Group gap="md" wrap="wrap">
        <Metric icon={<Gauge size={14} />} value={t("bikes.kilometres", { count: bike.total_km ?? 0 })} />
        <Metric icon={<ArrowUpRight size={14} />} value={t("bikes.metres", { count: bike.total_elevation_m ?? 0 })} />
        <Metric
          icon={<Clock size={14} />}
          value={t("bikes.hours", { count: Math.round((bike.total_time_min ?? 0) / 60) })}
        />
      </Group>
    </Stack>
  );
}

function Metric({ icon, value }: { icon: ReactElement; value: string }): ReactElement {
  return (
    <Group gap={6} wrap="nowrap" c="var(--mantine-color-text-8)">
      {icon}
      <Text className="font-mono" fz={13} c="text.6" lineClamp={1}>
        {value}
      </Text>
    </Group>
  );
}

// The specs read inline, since desktop has the room; the full sheet stays one click away.
function SpecGrid({ bike, cols }: { bike: Bike; cols: number }): ReactElement {
  const { t, i18n } = useTranslation();
  const unknown = t("addBike.summaryNotSpecified");
  const orUnknown = (value: string | null): string => (value === null || value === "" ? unknown : value);
  const weight =
    bike.bike_weight_kg === null
      ? unknown
      : t("bikes.kilograms", {
          weight: new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 }).format(bike.bike_weight_kg),
        });

  return (
    <SimpleGrid cols={cols} spacing="lg" verticalSpacing={8}>
      <SpecRow label={t("addBike.category")} value={orUnknown(bike.bike_type)} />
      <SpecRow label={t("addBike.year")} value={bike.year === null ? unknown : String(bike.year)} />
      <SpecRow label={t("addBike.frameSize")} value={orUnknown(bike.bike_size)} />
      <SpecRow label={t("addBike.wheelSize")} value={orUnknown(bike.wheel_size)} />
      <SpecRow label={t("bikes.frameMaterial")} value={orUnknown(bike.frame_material)} />
      <SpecRow label={t("bikes.weight")} value={weight} />
    </SimpleGrid>
  );
}

function SpecRow({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <Group justify="space-between" gap="md" wrap="nowrap">
      <Text fz={13} c="var(--color-text-dim)" style={{ flexShrink: 0 }}>
        {label}
      </Text>
      <Text className="font-mono" fz={13} c="text.6" ta="right" lineClamp={1}>
        {value}
      </Text>
    </Group>
  );
}

function AllSpecsLink({ onOpenSpecs, padded = false }: { onOpenSpecs: () => void; padded?: boolean }): ReactElement {
  const { t } = useTranslation();

  return (
    <UnstyledButton onClick={onOpenSpecs} className="hover-veil" px={padded ? "md" : 0} py={padded ? 15 : 0} w="100%">
      <Group justify="space-between" wrap="nowrap">
        <Group gap={8} wrap="nowrap">
          <Info size={16} color="var(--color-text-dim)" />
          <Text fz={15} fw={600} c="text.6">
            {t("bikes.specsAction")}
          </Text>
        </Group>
        <ChevronRight size={16} color="var(--color-text-dim)" />
      </Group>
    </UnstyledButton>
  );
}

// The archived note and the Strava pitch - each only when it applies.
function Leftovers({ bike, archived, paired, onPairGear }: BikeDetailPrototypeProps): ReactElement | null {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const connect = useConnectStrava();

  if (archived) {
    return (
      <Paper radius="lg" p="md" style={{ ...CARD, boxShadow: "var(--elev-row)" }}>
        <Group gap={8} wrap="nowrap" align="flex-start">
          <Archive size={16} color="var(--color-text-dim)" style={{ flexShrink: 0, marginTop: 2 }} />
          <Stack gap={2}>
            <Text fz={13} fw={600} c="text.6">
              {t("bikes.archivedTitle")}
            </Text>
            <Text fz={12} c="var(--color-text-dim)" style={{ lineHeight: 1.45 }}>
              {t("bikes.archivedBody")}
            </Text>
          </Stack>
        </Group>
      </Paper>
    );
  }
  if (paired) return null;

  return (
    <BikeStravaCard
      key={bike.id}
      accountConnected={user?.strava_athlete_id != null}
      onConnectAccount={() => connect.mutate()}
      onPairGear={onPairGear}
      connectFailed={connect.isError}
    />
  );
}

function Tiles({ bike, archived, cols }: { bike: Bike; archived: boolean; cols: number }): ReactElement {
  const navigate = useNavigate();
  const id = String(bike.id);

  return (
    <BikeActionTiles
      cols={cols}
      onAddService={archived ? undefined : () => navigate(`/service/new?bike=${id}`)}
      onOpenReports={() => navigate(`/reports?bike=${id}`)}
      onOpenHistory={() => navigate(`/bikes/${id}/history`)}
      onOpenSetup={() => navigate(`/bikes/${id}/setup`)}
    />
  );
}

function RecentHistory({ bikeId }: { bikeId: number }): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useRecentServices(bikeId);

  return (
    <Stack gap="sm">
      <SectionTitle>{t("service.recentTitle")}</SectionTitle>
      <ServiceList
        services={data?.items ?? []}
        isLoading={isLoading}
        isError={isError}
        footer={
          <UnstyledButton
            onClick={() => navigate(`/bikes/${String(bikeId)}/history`)}
            className="hover-veil"
            p="0.875rem"
            w="100%"
          >
            <Group justify="center" gap={8} wrap="nowrap">
              <Text className="font-mono uppercase" fz={12} fw={500} c="text.6" lts="0.08em">
                {t("service.viewAll")}
              </Text>
              <ArrowRight size={14} color="var(--mantine-color-text-6)" />
            </Group>
          </UnstyledButton>
        }
      />
    </Stack>
  );
}

function SectionTitle({ children }: { children: ReactNode }): ReactElement {
  return (
    <Text fw={600} fz={15} c="text.7">
      {children}
    </Text>
  );
}
