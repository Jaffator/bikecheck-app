// Strava's own "Connect with Strava" artwork: their brand rules require it on every way into
// their OAuth, unaltered - so it scales but is never restyled.
import type { ReactElement } from "react";
import { UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import orangeArtwork from "@/assets/strava/btn_strava_connect_with_orange.svg";
import whiteArtwork from "@/assets/strava/btn_strava_connect_with_white.svg";

// The artwork's own height.
const NATIVE_HEIGHT = 48;

// White is Strava's own variant for a surface already in their orange.
const ARTWORK = { orange: orangeArtwork, white: whiteArtwork } as const;

interface StravaConnectButtonProps {
  onClick: () => void;
  // While the redirect to Strava is under way: greyed out and inert, the artwork has no spinner.
  pending?: boolean;
  height?: number;
  variant?: keyof typeof ARTWORK;
}

export function StravaConnectButton({
  onClick,
  pending = false,
  height = NATIVE_HEIGHT,
  variant = "orange",
}: StravaConnectButtonProps): ReactElement {
  const { t } = useTranslation();

  return (
    <UnstyledButton
      onClick={onClick}
      disabled={pending}
      aria-label={t("strava.connect")}
      aria-busy={pending}
      className="active:scale-[0.985]"
      style={{
        display: "inline-flex",
        flexShrink: 0,
        opacity: pending ? 0.5 : 1,
        cursor: pending ? "default" : "pointer",
        transition: "transform 0.12s ease, opacity 0.12s ease",
      }}
    >
      <img src={ARTWORK[variant]} alt="" height={height} style={{ display: "block", height, width: "auto" }} />
    </UnstyledButton>
  );
}
