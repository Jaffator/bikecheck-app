// Desktop `/bikes/:id`: the bike itself on the left, what it owes and is made of on the right.
import type { ReactElement, ReactNode } from "react";
import { Anchor, Breadcrumbs, Button, Grid, Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Archive, ArrowRight, Pencil } from "lucide-react";
import type { RiddenBike } from "@/features/bikes/bikes.types";
import { BikeActionTiles } from "@/features/bikes/ui/BikeActionTiles";
import { BikeExportButton } from "@/features/bikes/ui/BikeExportButton";
import { BikeHeroCard } from "@/features/bikes/ui/BikeHeroCard";
import { BikeComponentsSection } from "@/features/components/ui/BikeComponentsSection";
import { useRecentServices } from "@/features/service/service.queries";
import { ServiceList } from "@/features/service/ui/ServiceList";
import type { TrackedAction } from "@/features/service_tracking/tracking.types";
import { TrackedActionsSection } from "@/features/service_tracking/ui/TrackedActionsSection";

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
  openLinks: number;
  onOpenSpecs: () => void;
  onExport: () => void;
  onPairGear: () => void;
  onOpenSharing: () => void;
}

// The left column is the phone's own stack, card to tiles, since it is about as wide as a phone.
export function BikeDetailDesktop({
  bike,
  trackedActions,
  archived,
  openLinks,
  onOpenSpecs,
  onExport,
  onPairGear,
  onOpenSharing,
}: BikeDetailDesktopProps): ReactElement {
  const navigate = useNavigate();
  const id = String(bike.id);

  // Below lg the columns stack, bike first.
  return (
    <Grid gap="lg" align="flex-start">
      <Grid.Col span={{ base: 12, lg: 4 }}>
        <Stack gap="md">
          <BikeHeroCard
            bike={bike}
            trackedActions={trackedActions}
            archived={archived}
            onOpenSpecs={onOpenSpecs}
            onPairGear={onPairGear}
            onOpenSharing={onOpenSharing}
          />
          {archived && <ArchivedNote />}
          <BikeExportButton onExport={onExport} />
          <BikeActionTiles
            onAddService={archived ? undefined : () => navigate(`/service/new?bike=${id}`)}
            onOpenHistory={() => navigate(`/service?bike=${id}`)}
            onOpenSetup={() => navigate(`/bikes/${id}/setup`)}
            onOpenLinks={() => navigate(`/reports?bike=${id}`)}
            openLinks={openLinks}
          />
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

// Add service is the first tile under the card, so the header keeps only Edit and the menu.
export function BikeDetailHeaderActions({ bikeId, archived, menu }: BikeDetailHeaderActionsProps): ReactElement | null {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (archived) return null;

  return (
    <Group gap="sm" wrap="nowrap">
      <Button
        variant="outline"
        radius="md"
        leftSection={<Pencil size={16} color="var(--mantine-color-primary-5)" />}
        onClick={() => navigate(`/bikes/${String(bikeId)}/edit`)}
      >
        {t("bikes.headerEdit")}
      </Button>
      {menu}
    </Group>
  );
}

function ArchivedNote(): ReactElement {
  const { t } = useTranslation();

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
