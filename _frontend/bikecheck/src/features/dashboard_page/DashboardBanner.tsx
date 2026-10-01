// Home's banners: everything keeping rides out of the numbers, each with its fix.
import { useState, type CSSProperties, type ReactElement } from "react";
import { Button, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CalendarClock, ChevronRight, Link2Off, Unplug, type LucideIcon } from "lucide-react";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { useBikes } from "@/features/bikes/bikes.queries";
import type { ListedBike } from "@/features/bikes/bikes.types";
import { useConnectStrava, usePendingRides } from "@/features/strava/strava.queries";
import { GearLinkingSheet } from "@/features/strava/ui/GearLinkingSheet";
import { useCurrentUser } from "@/features/users/users.queries";

type Problem = { kind: "connect" } | { kind: "pair"; bikes: ListedBike[] } | { kind: "assign"; count: number };

// All at once, so one unpaired bike can no longer hide rides already waiting for a bike.
function homeProblems(connected: boolean, unpaired: ListedBike[], pendingCount: number): Problem[] {
  const problems: Problem[] = [];
  if (!connected) problems.push({ kind: "connect" });
  // Pairing picks Strava gear, so it needs the connection.
  else if (unpaired.length > 0) problems.push({ kind: "pair", bikes: unpaired });
  // Disconnecting keeps the rides, and assigning one needs no Strava.
  if (pendingCount > 0) problems.push({ kind: "assign", count: pendingCount });
  return problems;
}

function useHomeProblems(): Problem[] {
  const { data: user } = useCurrentUser();
  const { data: bikes } = useBikes();
  const { data: pending } = usePendingRides();

  // Unknown until the user loads; guessing "not connected" would flash the wrong banner.
  if (user === undefined) return [];
  const unpaired = (bikes ?? []).filter((bike) => bike.strava_gear_id === null);
  return homeProblems(Boolean(user.strava_athlete_id), unpaired, pending?.length ?? 0);
}

// Tinted rather than filled, so it reads as a note on the page and not as one more card.
const BANNER_SURFACE: CSSProperties = {
  borderRadius: "var(--mantine-radius-lg)",
  backgroundColor: "color-mix(in srgb, var(--mantine-color-primary-6) 10%, transparent)",
  border: "1px solid color-mix(in srgb, var(--mantine-color-primary-6) 40%, transparent)",
};

export function DashboardBanner(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const problems = useHomeProblems();
  const connect = useConnectStrava();
  const [pairing, setPairing] = useState(false);

  return (
    <>
      {problems.map((problem) => {
        switch (problem.kind) {
          case "connect":
            return (
              <Banner
                key="connect"
                icon={Unplug}
                title={t("strava.notConnectedTitle")}
                body={connect.isError ? t("strava.connectFailed") : t("dashboard.bannerStravaBody")}
                action={t("strava.connect")}
                loading={connect.isPending}
                onAction={() => connect.mutate()}
              />
            );
          case "pair":
            return (
              <Banner
                key="pair"
                icon={Link2Off}
                title={t("strava.unpairedBikes", { count: problem.bikes.length })}
                body={t("dashboard.bannerUnpairedBody", { names: problem.bikes.map(bikeTitle).join(", ") })}
                action={t("dashboard.bannerPairAction")}
                onAction={() => setPairing(true)}
              />
            );
          case "assign":
            return (
              <Banner
                key="assign"
                icon={CalendarClock}
                title={t("pendingRides.tileDetail", { count: problem.count })}
                body={t("dashboard.bannerPendingBody")}
                action={t("pendingRides.cardAction")}
                onAction={() => navigate("/rides?tab=pending")}
              />
            );
        }
      })}

      <GearLinkingSheet opened={pairing} onClose={() => setPairing(false)} />
    </>
  );
}

// The phone's pair and assign banners; StravaStatusCard already pitches the connection there.
export function DashboardBannerPhone(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const problems = useHomeProblems();
  const [pairing, setPairing] = useState(false);

  return (
    <>
      {problems.map((problem) => {
        switch (problem.kind) {
          case "connect":
            return null;
          case "pair":
            return (
              <PhoneBanner
                key="pair"
                icon={Link2Off}
                title={t("strava.unpairedBikes", { count: problem.bikes.length })}
                body={t("dashboard.bannerNotCountedShort")}
                onOpen={() => setPairing(true)}
              />
            );
          case "assign":
            return (
              <PhoneBanner
                key="assign"
                icon={CalendarClock}
                title={t("pendingRides.tileDetail", { count: problem.count })}
                body={t("dashboard.bannerNotCountedShort")}
                onOpen={() => navigate("/rides?tab=pending")}
              />
            );
        }
      })}

      <GearLinkingSheet opened={pairing} onClose={() => setPairing(false)} />
    </>
  );
}

interface BannerProps {
  icon: LucideIcon;
  title: string;
  body: string;
  action: string;
  onAction: () => void;
  loading?: boolean;
}

function Banner({ icon: Icon, title, body, action, onAction, loading = false }: BannerProps): ReactElement {
  return (
    <Group wrap="nowrap" gap="md" py={10} pr={10} pl="md" style={BANNER_SURFACE}>
      <Icon size={20} color="var(--mantine-color-primary-6)" style={{ flexShrink: 0 }} />
      <Text fz={13} c="text.7" style={{ flex: 1, minWidth: 0 }}>
        <Text span inherit fw={600} className="tabular-nums">
          {title}
        </Text>{" "}
        — {body}
      </Text>
      <Button
        color="primary.6"
        c="textDark.6"
        radius="md"
        loading={loading}
        onClick={onAction}
        style={{ flexShrink: 0 }}
      >
        {action}
      </Button>
    </Group>
  );
}

interface PhoneBannerProps {
  icon: LucideIcon;
  title: string;
  body: string;
  onOpen: () => void;
}

// No button on a phone: the whole banner is the tap target.
function PhoneBanner({ icon: Icon, title, body, onOpen }: PhoneBannerProps): ReactElement {
  return (
    <UnstyledButton
      onClick={onOpen}
      className="active:scale-[0.985]"
      style={{ ...BANNER_SURFACE, display: "block", width: "100%", transition: "transform 0.12s ease" }}
    >
      <Group wrap="nowrap" gap="sm" px="md" py={10}>
        <Icon size={20} color="var(--mantine-color-primary-6)" style={{ flexShrink: 0 }} />
        <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
          <Text fz={14} fw={600} c="text.6" className="tabular-nums" lineClamp={1}>
            {title}
          </Text>
          <Text fz={12} c="text.7" lineClamp={1}>
            {body}
          </Text>
        </Stack>
        <ChevronRight size={16} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />
      </Group>
    </UnstyledButton>
  );
}
