// Strava's brand rules fix the wording (never translated), bold, and #FC5200 or underlined.
import type { CSSProperties, ReactElement } from "react";
import { Anchor } from "@mantine/core";

const STRAVA_ORANGE = "#FC5200";

// A tap target on touch: the text keeps Strava's orange, the area only frames it.
const BOXED: CSSProperties = {
  padding: "4px 10px",
  borderRadius: 8,
  border: `1px solid color-mix(in srgb, ${STRAVA_ORANGE} 45%, transparent)`,
  backgroundColor: `color-mix(in srgb, ${STRAVA_ORANGE} 10%, transparent)`,
  textDecoration: "none",
};

interface ViewOnStravaLinkProps {
  // Null for a ride not sourced from Strava, which gets no link.
  activityId: string | null;
  fz?: number;
  boxed?: boolean;
}

export function ViewOnStravaLink({ activityId, fz = 13, boxed = false }: ViewOnStravaLinkProps): ReactElement | null {
  if (activityId === null) return null;
  return (
    <Anchor
      href={`https://www.strava.com/activities/${activityId}`}
      target="_blank"
      rel="noopener noreferrer"
      fz={fz}
      fw={700}
      c={STRAVA_ORANGE}
      underline={boxed ? "never" : "hover"}
      // Sits inside pressable rows, which must not open as well.
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      style={{ display: "inline-block", width: "fit-content", whiteSpace: "nowrap", flexShrink: 0, ...(boxed && BOXED) }}
    >
      View on Strava
    </Anchor>
  );
}
