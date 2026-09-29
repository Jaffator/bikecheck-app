// Desktop Home's line under the title: today, Strava and its last sync, the garage and who sees it.
import { useState, type CSSProperties, type ReactElement } from "react";
import { Group, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useBikes } from "@/features/bikes/bikes.queries";
import { useMyProfile } from "@/features/profile/profile.queries";
import { VISIBILITY_LABEL_KEY } from "@/features/profile/profileVisibility";
import { ShareDrawer } from "@/features/profile/ui/ShareDrawer";
import { StravaSyncStatus } from "@/features/strava/ui/StravaSyncStatus";

// The veil reaches past the words, and the negative margin gives that room back to the line.
const GARAGE_LINK_STYLE: CSSProperties = { borderRadius: 6, padding: "2px 6px", margin: "-2px -6px" };

export function ContextLine(): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: bikes } = useBikes();
  const { data: profile } = useMyProfile();
  const [sharing, setSharing] = useState(false);

  return (
    <>
      <Group gap={8} wrap="wrap" fz={13} c="var(--color-text-dim)">
        <span>{longToday(i18n.language)}</span>
        <Separator />
        <StravaSyncStatus />
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
