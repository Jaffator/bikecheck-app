// Desktop `/bikes/:id`: the bike itself on the left, what it owes and is made of on the right.
import type { ReactElement, ReactNode } from "react";
import {
  ActionIcon,
  Anchor,
  Box,
  Breadcrumbs,
  Button,
  Grid,
  Group,
  Paper,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Clock,
  FileText,
  Gauge,
  Info,
  Pencil,
  Plus,
  Share2,
} from "lucide-react";
import type { Bike, RiddenBike } from "@/features/bikes/bikes.types";
import { bikeFigures } from "@/features/bikes/bikeFigures";
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

// Matches the header's own desktop page title.
const TITLE_TEXT = { fontSize: 28, fontWeight: 700, letterSpacing: "var(--tracking-display)" } as const;

const CARD = {
  backgroundColor: "var(--mantine-color-cards-6)",
  backgroundImage: "var(--card-glow)",
  border: "none",
  overflow: "hidden",
} as const;

interface BikeDetailDesktopProps {
  bike: RiddenBike;
  trackedActions: TrackedAction[];
  archived: boolean;
  paired: boolean;
  onOpenSpecs: () => void;
  onExport: () => void;
  onPairGear: () => void;
}

export function BikeDetailDesktop(props: BikeDetailDesktopProps): ReactElement {
  const { bike, archived } = props;

  // Below lg the columns stack, bike first.
  return (
    <Grid gap="lg" align="flex-start">
      <Grid.Col span={{ base: 12, lg: 4 }}>
        <Stack gap="md">
          <HeroCard {...props} />
          <Leftovers {...props} />
          <Tiles bikeId={bike.id} />
          <RecentHistory bikeId={bike.id} />
        </Stack>
      </Grid.Col>
      <Grid.Col span={{ base: 12, lg: 8 }}>
        <Stack gap="md">
          <TrackedActionsSection bikeId={bike.id} />
          <BikeComponentsSection bikeId={bike.id} ebike={bike.ebike} readOnly={archived} />
        </Stack>
      </Grid.Col>
    </Grid>
  );
}

export function BikeDetailBreadcrumbs(): ReactElement {
  const { t } = useTranslation();

  return (
    <Breadcrumbs separator="›" separatorMargin="xs" c="var(--color-text-dim)" style={TITLE_TEXT}>
      <Anchor component={Link} to="/bikes" c="var(--color-text-dim)" underline="hover" style={TITLE_TEXT}>
        {t("page.bikes")}
      </Anchor>
      <Text c="text.6" aria-current="page" style={TITLE_TEXT}>
        {t("bikes.detailTitle")}
      </Text>
    </Breadcrumbs>
  );
}

interface BikeDetailHeaderActionsProps {
  bikeId: number;
  archived: boolean;
  // The `⋯` menu; an Archived Bike has none, since everything in it is a write.
  menu: ReactNode;
}

export function BikeDetailHeaderActions({ bikeId, archived, menu }: BikeDetailHeaderActionsProps): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const id = String(bikeId);
  const reportButton = (
    <Button
      variant="outline"
      radius="md"
      leftSection={<FileText size={16} color="var(--mantine-color-primary-5)" />}
      onClick={() => navigate(`/reports?bike=${id}`)}
    >
      {t("bikes.headerReport")}
    </Button>
  );

  if (archived) return reportButton;

  return (
    <Group gap="sm" wrap="nowrap">
      <Button
        variant="outline"
        radius="md"
        leftSection={<Pencil size={16} color="var(--mantine-color-primary-5)" />}
        onClick={() => navigate(`/bikes/${id}/edit`)}
      >
        {t("bikes.headerEdit")}
      </Button>
      {reportButton}
      <Button
        color="primary.6"
        c="textDark.6"
        radius="md"
        leftSection={<Plus size={16} />}
        onClick={() => navigate(`/service/new?bike=${id}`)}
      >
        {t("fab.addService")}
      </Button>
      {menu}
    </Group>
  );
}

// The phone's hero card, as is.
function HeroCard({ bike, trackedActions, onOpenSpecs, onExport }: BikeDetailDesktopProps): ReactElement {
  return (
    <Paper radius="lg" style={{ ...CARD, boxShadow: "var(--elev-hero)" }}>
      <Photo bike={bike} trackedActions={trackedActions} />
      <Box p="md">
        <NameBlock bike={bike} onExport={onExport} />
      </Box>
      <Box style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
        <AllSpecsLink onOpenSpecs={onOpenSpecs} />
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

function NameBlock({ bike, onExport }: { bike: RiddenBike; onExport: () => void }): ReactElement {
  const { t } = useTranslation();
  const figures = bikeFigures(bike);

  return (
    <Stack gap={8}>
      <Group gap="sm" wrap="nowrap" align="flex-start" justify="space-between">
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Text fw={700} fz={24} c="text.6" lh={1.2} lineClamp={2}>
            {bikeTitle(bike)}
          </Text>
          {bike.bikename !== null && bike.bikename !== "" && (
            <Text className="tabular-nums" fz={11} tt="uppercase" c="var(--color-text-dim)" lineClamp={1}>
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
        <Metric icon={<Gauge size={14} />} value={t("bikes.kilometres", { count: figures.km })} />
        <Metric icon={<ArrowUpRight size={14} />} value={t("bikes.metres", { count: figures.elevationM })} />
        <Metric
          icon={<Clock size={14} />}
          value={t("bikes.hours", { count: Math.round(figures.timeMin / 60) })}
        />
      </Group>
    </Stack>
  );
}

function Metric({ icon, value }: { icon: ReactElement; value: string }): ReactElement {
  return (
    <Group gap={6} wrap="nowrap" c="var(--mantine-color-text-8)">
      {icon}
      <Text className="tabular-nums" fz={13} c="text.6" lineClamp={1}>
        {value}
      </Text>
    </Group>
  );
}

function AllSpecsLink({ onOpenSpecs }: { onOpenSpecs: () => void }): ReactElement {
  const { t } = useTranslation();

  return (
    <UnstyledButton onClick={onOpenSpecs} className="hover-veil" px="md" py={15} w="100%">
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
function Leftovers({ bike, archived, paired, onPairGear }: BikeDetailDesktopProps): ReactElement | null {
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

// Add service and Reports live in the header here, so only the two places to go remain.
function Tiles({ bikeId }: { bikeId: number }): ReactElement {
  const navigate = useNavigate();
  const id = String(bikeId);

  return (
    <BikeActionTiles
      onOpenHistory={() => navigate(`/service?bike=${id}`)}
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
            onClick={() => navigate(`/service?bike=${String(bikeId)}`)}
            className="hover-veil"
            p="0.875rem"
            w="100%"
          >
            <Group justify="center" gap={8} wrap="nowrap">
              <Text className="tabular-nums uppercase" fz={12} fw={500} c="text.6" lts="var(--tracking-label)">
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
