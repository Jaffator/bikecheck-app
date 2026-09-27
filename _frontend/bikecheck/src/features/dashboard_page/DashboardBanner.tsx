// Desktop Home's one banner: the most fundamental thing keeping rides out of the numbers, and its fix.
import { useState, type ReactElement } from "react";
import { Button, Group, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CalendarClock, Link2Off, Unplug, type LucideIcon } from "lucide-react";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { useBikes } from "@/features/bikes/bikes.queries";
import type { ListedBike } from "@/features/bikes/bikes.types";
import { useConnectStrava, usePendingRides } from "@/features/strava/strava.queries";
import { GearLinkingSheet } from "@/features/strava/ui/GearLinkingSheet";
import { useCurrentUser } from "@/features/users/users.queries";

type Problem = { kind: "connect" } | { kind: "pair"; bikes: ListedBike[] } | { kind: "assign"; count: number };

// First match wins: without Strava no ride arrives, and an unpaired bike's rides land unassigned.
function firstProblem(connected: boolean, unpaired: ListedBike[], pendingCount: number): Problem | null {
  if (!connected) return { kind: "connect" };
  if (unpaired.length > 0) return { kind: "pair", bikes: unpaired };
  if (pendingCount > 0) return { kind: "assign", count: pendingCount };
  return null;
}

export function DashboardBanner(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const { data: bikes } = useBikes();
  const { data: pending } = usePendingRides();
  const connect = useConnectStrava();
  const [pairing, setPairing] = useState(false);

  const unpaired = (bikes ?? []).filter((bike) => bike.strava_gear_id === null);
  // Unknown until the user loads; guessing "not connected" would flash the wrong banner.
  const problem = user === undefined ? null : firstProblem(Boolean(user.strava_athlete_id), unpaired, pending?.length ?? 0);

  return (
    <>
      {problem?.kind === "connect" && (
        <Banner
          icon={Unplug}
          title={t("strava.notConnectedTitle")}
          body={connect.isError ? t("strava.connectFailed") : t("dashboard.bannerStravaBody")}
          action={t("strava.connect")}
          loading={connect.isPending}
          onAction={() => connect.mutate()}
        />
      )}
      {problem?.kind === "pair" && (
        <Banner
          icon={Link2Off}
          title={t("strava.unpairedBikes", { count: problem.bikes.length })}
          body={t("dashboard.bannerUnpairedBody", { names: problem.bikes.map(bikeTitle).join(", ") })}
          action={t("dashboard.bannerPairAction")}
          onAction={() => setPairing(true)}
        />
      )}
      {problem?.kind === "assign" && (
        <Banner
          icon={CalendarClock}
          title={t("pendingRides.tileDetail", { count: problem.count })}
          body={t("dashboard.bannerPendingBody")}
          action={t("pendingRides.cardAction")}
          onAction={() => navigate("/rides?tab=pending")}
        />
      )}

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

// Tinted rather than filled, so it reads as a note on the page and not as one more card.
function Banner({ icon: Icon, title, body, action, onAction, loading = false }: BannerProps): ReactElement {
  return (
    <Group
      wrap="nowrap"
      gap="md"
      py={10}
      pr={10}
      pl="md"
      style={{
        borderRadius: "var(--mantine-radius-lg)",
        backgroundColor: "color-mix(in srgb, var(--mantine-color-primary-6) 10%, transparent)",
        border: "1px solid color-mix(in srgb, var(--mantine-color-primary-6) 40%, transparent)",
      }}
    >
      <Icon size={20} color="var(--mantine-color-primary-6)" style={{ flexShrink: 0 }} />
      <Text fz={13} c="text.7" style={{ flex: 1, minWidth: 0 }}>
        <Text span inherit fw={600}>
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
