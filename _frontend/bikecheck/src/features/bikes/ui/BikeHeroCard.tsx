// The bike's own card on its page: photo, name and condition, what it has done, then one row each
// for its specs, Strava and sharing. Phone and desktop show the same card.
import type { ReactElement, ReactNode } from "react";
import { Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ChevronRight, Info, Users } from "lucide-react";
import StravaMark from "@/assets/icons/svg_icons/strava.svg?react";
import type { RiddenBike } from "@/features/bikes/bikes.types";
import { bikeFigures } from "@/features/bikes/bikeFigures";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { useMyProfile } from "@/features/profile/profile.queries";
import { VISIBILITY_ICON, VISIBILITY_LABEL_KEY } from "@/features/profile/profileVisibility";
import { attentionColor } from "@/features/service_tracking/attentionLevel";
import type { TrackedAction } from "@/features/service_tracking/tracking.types";
import { HealthBadge } from "@/features/service_tracking/ui/HealthBadge";
import { useConnectStrava } from "@/features/strava/strava.queries";
import { StravaConnectButton } from "@/features/strava/ui/StravaConnectButton";
import { useCurrentUser } from "@/features/users/users.queries";
import { formatNumber } from "@/utils/number";
import { BikePhoto } from "./BikePhoto";
import { profileVisibilityOf } from "@/features/bikes/bikeSharing";

// Strava's artwork at a height that fits a row; it scales but is never restyled.
const CONNECT_HEIGHT = 32;
const ROW_ICON = 16;

interface BikeHeroCardProps {
  bike: RiddenBike;
  trackedActions: TrackedAction[];
  // An Archived Bike takes no writes, so it has no Strava or sharing row.
  archived: boolean;
  onOpenSpecs: () => void;
  onPairGear: () => void;
  onOpenSharing: () => void;
}

export function BikeHeroCard({
  bike,
  trackedActions,
  archived,
  onOpenSpecs,
  onPairGear,
  onOpenSharing,
}: BikeHeroCardProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Paper
      radius="lg"
      style={{
        overflow: "hidden",
        backgroundColor: "var(--mantine-color-cards-6)",
        border: "none",
        boxShadow: "var(--elev-hero)",
      }}
    >
      {/* The photo shows only the bike: its condition, Strava and sharing are read below. */}
      <BikePhoto imageUrl={bike.image_url} title={bikeTitle(bike)} subtitle={null} titleSize={24} showCaption={false} />

      <Stack gap={14} p="md">
        <Group gap="sm" wrap="nowrap" align="center" justify="space-between">
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Text fw={700} fz={24} c="text.6" lh={1.2} lineClamp={2}>
              {bikeTitle(bike)}
            </Text>
            {/* The garage and this page are the only places a bike answers to its nickname. */}
            {bike.bikename !== null && bike.bikename !== "" && (
              <Text className="tabular-nums" fz={11} tt="uppercase" c="var(--color-text-dim)" lineClamp={1}>
                {bike.bikename}
              </Text>
            )}
          </Stack>
          <HealthBadge actions={trackedActions} />
        </Group>
        <Readings bike={bike} />
      </Stack>

      <CardRow
        icon={<Info size={ROW_ICON} color="var(--color-text-dim)" />}
        label={t("bikes.specsAction")}
        onClick={onOpenSpecs}
        trailing={<Chevron />}
      />
      {!archived && <StravaRow bike={bike} onPairGear={onPairGear} />}
      {!archived && <SharingRow bike={bike} onOpenSharing={onOpenSharing} />}
    </Paper>
  );
}

// The three figures a bike keeps by itself, each named, from one card edge to the other.
function Readings({ bike }: { bike: RiddenBike }): ReactElement {
  const { t, i18n } = useTranslation();
  const figures = bikeFigures(bike);
  const number = (value: number): string => formatNumber(value, i18n.language);

  return (
    <Group justify="space-between" wrap="nowrap" gap="sm">
      <Reading label={t("bikes.distance")} value={`${number(figures.km)} km`} />
      <Reading label={t("bikes.elevation")} value={`${number(figures.elevationM)} m`} />
      <Reading label={t("bikes.time")} value={`${number(Math.round(figures.timeMin / 60))} h`} />
    </Group>
  );
}

function Reading({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <Stack gap={1}>
      <Text className="tabular-nums" fz={15} fw={600} lh="20px" c="text.6" style={{ whiteSpace: "nowrap" }}>
        {value}
      </Text>
      <Text fz={12} lh="16px" c="text.8">
        {label}
      </Text>
    </Stack>
  );
}

// Three states, one row, so pairing never moves the page: connect the account, pair the bike,
// or open the pairing that is set.
function StravaRow({ bike, onPairGear }: { bike: RiddenBike; onPairGear: () => void }): ReactElement {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const connect = useConnectStrava();
  const icon = <StravaMark width={ROW_ICON} height={ROW_ICON} color="var(--mantine-color-strava-6)" />;

  // Strava's own button is the only way into their OAuth, so the row itself is not pressable.
  if (user?.strava_athlete_id == null) {
    return (
      <>
        <CardRow
          icon={icon}
          label={t("strava.statusTitle")}
          trailing={
            <StravaConnectButton onClick={() => connect.mutate()} pending={connect.isPending} height={CONNECT_HEIGHT} />
          }
        />
        {connect.isError && (
          <Text px="md" pb="sm" fz={12} c="red.5">
            {t("strava.connectFailed")}
          </Text>
        )}
      </>
    );
  }

  const paired = bike.strava_gear_id !== null;
  return (
    <CardRow
      icon={icon}
      label={t("strava.statusTitle")}
      detail={t(paired ? "strava.paired" : "strava.notPaired")}
      onClick={onPairGear}
      trailing={
        paired ? (
          <Chevron />
        ) : (
          <Text fz={14} fw={600} c="strava.6">
            {t("strava.pair")}
          </Text>
        )
      }
    />
  );
}

// On or off in words; the icon says to whom. The switch itself is in the share drawer.
function SharingRow({ bike, onOpenSharing }: { bike: RiddenBike; onOpenSharing: () => void }): ReactElement {
  const { t } = useTranslation();
  const { data: profile } = useMyProfile();
  const visibility = profileVisibilityOf(bike, profile);
  const on = visibility !== null;
  const Icon = on ? VISIBILITY_ICON[visibility] : Users;
  // The ramp's own green, the one the health badge says "very good" in.
  const onColor = attentionColor(0);

  return (
    <CardRow
      icon={<Icon size={ROW_ICON} color={on ? onColor : "var(--color-text-dim)"} />}
      label={t("bikes.sharingRow")}
      detail={on ? t(VISIBILITY_LABEL_KEY[visibility]) : undefined}
      onClick={onOpenSharing}
      trailing={
        <Group gap={8} wrap="nowrap">
          <Text fz={13} fw={600} c={on ? onColor : "text.8"}>
            {t(on ? "bikes.sharingOn" : "sharing.visibilityOff")}
          </Text>
          <Chevron />
        </Group>
      }
    />
  );
}

interface CardRowProps {
  icon: ReactNode;
  label: string;
  // Dim, after the label.
  detail?: string;
  trailing: ReactNode;
  // Left out, the row only reads; its trailing control is the button.
  onClick?: () => void;
}

// One row under the card's figures, parted from what is above by a rule.
function CardRow({ icon, label, detail, trailing, onClick }: CardRowProps): ReactElement {
  const body = (
    <Group justify="space-between" wrap="nowrap" gap="sm" px="md" mih={52} py={8}>
      <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
        {icon}
        <Text fz={15} fw={600} c="text.6" lineClamp={1}>
          {label}
          {detail !== undefined && (
            <Text span inherit fw={500} c="text.8">
              {` · ${detail}`}
            </Text>
          )}
        </Text>
      </Group>
      {trailing}
    </Group>
  );
  const rule = { borderTop: "1px solid var(--color-border-subtle)" };

  if (onClick === undefined) return <div style={rule}>{body}</div>;
  return (
    <UnstyledButton onClick={onClick} className="hover-veil" w="100%" style={rule}>
      {body}
    </UnstyledButton>
  );
}

function Chevron(): ReactElement {
  return <ChevronRight size={16} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />;
}
