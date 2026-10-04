// Home's context line, under the desktop title or atop the phone page: today, Strava, the garage and who sees it.
import { useState, type CSSProperties, type ReactElement } from "react";
import { Group, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useBikes } from "@/features/bikes/bikes.queries";
import { useMyProfile } from "@/features/profile/profile.queries";
import { VISIBILITY_COLOR, VISIBILITY_ICON, VISIBILITY_LABEL_KEY } from "@/features/profile/profileVisibility";
import { ShareDrawer } from "@/features/profile/ui/ShareDrawer";
import { StravaSyncStatus } from "@/features/strava/ui/StravaSyncStatus";
import { useIsDesktop } from "@/layout/breakpoints";

// The veil reaches past the words, and the negative margin gives that room back to the line.
const GARAGE_LINK_STYLE: CSSProperties = { borderRadius: 6, padding: "2px 6px", margin: "-2px -6px" };

// A finger needs about 44 px; the negative margin keeps the line its height.
const GARAGE_TAP_STYLE: CSSProperties = { borderRadius: 6, padding: "12px 6px", margin: "-12px -6px" };

interface ContextLineProps {
  // The phone drops the date: it costs a whole line there.
  withDate?: boolean;
}

export function ContextLine({ withDate = true }: ContextLineProps): ReactElement {
  const { t, i18n } = useTranslation();
  const isDesktop = useIsDesktop();
  const { data: bikes } = useBikes();
  const { data: profile } = useMyProfile();
  const [sharing, setSharing] = useState(false);
  const VisibilityIcon = VISIBILITY_ICON[profile?.visibility ?? "OFF"];

  return (
    <>
      {/* Desktop keeps the garage in the line's run; the phone pins it to the right edge. */}
      <Group justify={isDesktop ? "flex-start" : "space-between"} gap={12} wrap="nowrap" fz={13} c="var(--color-text-dim)">
        <Group gap={8} wrap="wrap">
          {withDate && (
            <>
              <span>{longToday(i18n.language)}</span>
              <Separator />
            </>
          )}
          <StravaSyncStatus />
          {/* The phone has no room for it; the bike cards below show the garage anyway. */}
          {isDesktop && (
            <>
              <Separator />
              <span>{t("dashboard.bikesCount", { count: bikes?.length ?? 0 })}</span>
            </>
          )}
        </Group>
        {profile && (
          <UnstyledButton
            onClick={() => setSharing(true)}
            className="hover-veil"
            fz={13}
            c="text.7"
            style={isDesktop ? GARAGE_LINK_STYLE : GARAGE_TAP_STYLE}
          >
            <Group gap={6} wrap="nowrap">
              <VisibilityIcon size={14} color={VISIBILITY_COLOR[profile.visibility]} />
              <span>
                {t("dashboard.garageVisibility", { visibility: t(VISIBILITY_LABEL_KEY[profile.visibility]) })} ›
              </span>
            </Group>
          </UnstyledButton>
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
