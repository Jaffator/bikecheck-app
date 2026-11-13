// Strava's own "Connect with Strava" artwork: their brand rules require it on every way into
// their OAuth, unaltered - so it scales but is never restyled.
import type { CSSProperties, ReactElement } from "react";
import { UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useIsDesktop } from "@/layout/breakpoints";
import orangeArtwork from "@/assets/strava/btn_strava_connect_with_orange.svg";
import whiteArtwork from "@/assets/strava/btn_strava_connect_with_white.svg";

// The artwork's own size, which Strava's brand rules fix at 48 px everywhere.
const NATIVE_HEIGHT = 48;
const NATIVE_RATIO = "237 / 48";
// A wide desktop column would stretch the ratio into a slab, so desktop gets a fixed bar.
const DESKTOP_BAR_HEIGHT = 56;

// White is Strava's own variant for a surface already in their orange.
const ARTWORK = { orange: orangeArtwork, white: whiteArtwork } as const;
// Each artwork's own fill, so a full-width button reads as one surface around it.
const ARTWORK_FILL = { orange: "#FC5200", white: "#FFFFFF" } as const;

interface StravaConnectButtonProps {
  onClick: () => void;
  // While the redirect to Strava is under way: greyed out and inert, the artwork has no spinner.
  pending?: boolean;
  variant?: keyof typeof ARTWORK;
  // Fills the container's width in the artwork's colour, the artwork centred at its own size.
  fullWidth?: boolean;
}

export function StravaConnectButton({
  onClick,
  pending = false,
  variant = "orange",
  fullWidth = false,
}: StravaConnectButtonProps): ReactElement {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();

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
        ...(fullWidth && fullWidthFrame(variant, isDesktop)),
      }}
    >
      <img
        src={ARTWORK[variant]}
        alt=""
        style={{ display: "block", height: NATIVE_HEIGHT, width: "auto" }}
      />
    </UnstyledButton>
  );
}

// As big as the stretched artwork was (a fixed bar on desktop), the artwork smaller inside.
function fullWidthFrame(variant: keyof typeof ARTWORK, isDesktop: boolean): CSSProperties {
  return {
    display: "flex",
    width: "100%",
    ...(isDesktop ? { height: DESKTOP_BAR_HEIGHT } : { aspectRatio: NATIVE_RATIO }),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: ARTWORK_FILL[variant],
  };
}
