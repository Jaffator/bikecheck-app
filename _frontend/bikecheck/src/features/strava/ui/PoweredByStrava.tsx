// Strava's "Powered by Strava" lockup, which their API terms ask every app using their data to show.
import type { ReactElement } from "react";
import poweredByArtwork from "@/assets/strava/api_logo_pwrdBy_strava_horiz_white.svg";

interface PoweredByStravaProps {
  height?: number;
}

export function PoweredByStrava({ height = 12 }: PoweredByStravaProps): ReactElement {
  return <img src={poweredByArtwork} alt="Powered by Strava" height={height} style={{ display: "block", height, width: "auto" }} />;
}
