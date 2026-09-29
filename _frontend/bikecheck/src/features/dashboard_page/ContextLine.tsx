// Desktop Home's line under the title: today, Strava and its last sync, the garage and who sees it.
import { useState, type CSSProperties, type ReactElement } from "react";
import { Box, Group, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useBikes } from "@/features/bikes/bikes.queries";
import { useMyProfile } from "@/features/profile/profile.queries";
import { VISIBILITY_LABEL_KEY } from "@/features/profile/profileVisibility";
import { ShareDrawer } from "@/features/profile/ui/ShareDrawer";
import { useRides } from "@/features/rides/rides.queries";
import { QUIET_COLOR } from "@/features/service_tracking/attentionLevel";
import { usePendingRides } from "@/features/strava/strava.queries";
import type { PendingRide } from "@/features/strava/strava.types";
import { useCurrentUser } from "@/features/users/users.queries";

dayjs.extend(relativeTime);

// The veil reaches past the words, and the negative margin gives that room back to the line.
const GARAGE_LINK_STYLE: CSSProperties = { borderRadius: 6, padding: "2px 6px", margin: "-2px -6px" };

export function ContextLine(): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: user } = useCurrentUser();
  const { data: bikes } = useBikes();
  const { data: profile } = useMyProfile();
  const { data: rides } = useRides();
  const { data: pending } = usePendingRides();
  const [sharing, setSharing] = useState(false);

  const connected = Boolean(user?.strava_athlete_id);
  const lastStart = latestRideStart(rides?.pages[0]?.items[0]?.started_at ?? null, pending ?? []);

  return (
    <>
      <Group gap={8} wrap="wrap" fz={13} c="var(--color-text-dim)">
        <span>{longToday(i18n.language)}</span>
        <Separator />
        <Group gap={6} wrap="nowrap">
          <Box
            w={7}
            h={7}
            style={{
              borderRadius: 9999,
              flexShrink: 0,
              backgroundColor: connected ? QUIET_COLOR : "var(--mantine-color-strava-6)",
            }}
          />
          <span>{stravaStatus(connected, lastStart, t)}</span>
        </Group>
        <Separator />
        <span>{t("dashboard.bikesCount", { count: bikes?.length ?? 0 })}</span>
        {profile && (
          <>
            <Separator />
            <UnstyledButton onClick={() => setSharing(true)} className="hover-veil" fz={13} c="text.7" style={GARAGE_LINK_STYLE}>
              {t("dashboard.garageVisibility", { visibility: t(VISIBILITY_LABEL_KEY[profile.visibility]) })} ›
            </UnstyledButton>
          </>
        )}
      </Group>

      <ShareDrawer opened={sharing} onClose={() => setSharing(false)} />
    </>
  );
}

function Separator(): ReactElement {
  return <span aria-hidden>·</span>;
}

// Czech writes the weekday in lower case, and here it opens the line.
function longToday(language: string): string {
  const today = new Intl.DateTimeFormat(language, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  return today.charAt(0).toUpperCase() + today.slice(1);
}

// There is no sync timestamp, so the newest ride Strava delivered stands in for one.
function latestRideStart(lastRideStart: string | null, pending: PendingRide[]): string | null {
  const starts = [lastRideStart, ...pending.map((ride) => ride.started_at)].filter(
    (start): start is string => start !== null,
  );
  if (starts.length === 0) return null;
  return starts.reduce((latest, start) => (dayjs(start).isAfter(latest) ? start : latest));
}

function stravaStatus(connected: boolean, lastStart: string | null, t: TFunction): string {
  const strava = t("strava.statusTitle");
  if (!connected) return `${strava} · ${t("dashboard.notConnected")}`;
  if (lastStart === null) return strava;
  return `${strava} · ${t("dashboard.synced", { when: dayjs(lastStart).fromNow() })}`;
}
