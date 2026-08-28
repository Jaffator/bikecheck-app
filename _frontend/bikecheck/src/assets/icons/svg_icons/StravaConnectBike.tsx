// Composite Strava, link, and bike mark.
import type { CSSProperties, FunctionComponent, ReactNode } from "react";
import BikeMark from "./bike.svg?react";
import ConnectMark from "./connect.svg?react";
import StravaMark from "./strava.svg?react";

type StravaConnectBikeProps = {
  size?: number;
  stravaColor?: string;
  stravaCircleColor?: string;
  connectColor?: string;
  bikeColor?: string;
  bikeCircleColor?: string;
  className?: string;
};

// Reserve circle padding around glyphs.
const GLYPH_RATIO = 0.65;

// The link between the circles is drawn taller than the glyphs inside them.
const CONNECT_RATIO = 0.7;

// Fits a mark inside a square box whatever shape it is. Width and height are released to
// the mark's own proportions and only the box is capped, so the longer side is what the
// box limits - a wide mark is held by its width, a tall one by its height. Sizing by one
// side alone breaks the moment an icon is redrawn to a different aspect ratio: the other
// side hits the circle first and the ratio stops having any effect.
function glyphStyle(box: number, color: string): CSSProperties {
  return { width: "auto", height: "auto", maxWidth: box, maxHeight: box, color };
}

type CircleProps = {
  size: number;
  background: string;
  children: ReactNode;
};

const Circle: FunctionComponent<CircleProps> = ({ size, background, children }) => (
  <span
    className="inline-flex shrink-0 items-center justify-center rounded-full"
    style={{ width: size, height: size, background }}
  >
    {children}
  </span>
);

export const StravaConnectBike: FunctionComponent<StravaConnectBikeProps> = ({
  size = 40,
  stravaColor = "currentColor",
  stravaCircleColor = "var(--mantine-color-strava-2)",
  connectColor = "currentColor",
  bikeColor = "currentColor",
  bikeCircleColor = "var(--mantine-color-strava-2)",
  className,
}) => (
  <span className={`inline-flex items-center gap-3 ${className ?? ""}`}>
    <Circle size={size} background={bikeCircleColor}>
      <BikeMark style={glyphStyle(size * GLYPH_RATIO, bikeColor)} aria-hidden="true" />
    </Circle>
    <ConnectMark style={glyphStyle(size * CONNECT_RATIO, connectColor)} aria-hidden="true" />
    <Circle size={size} background={stravaCircleColor}>
      <StravaMark style={glyphStyle(size * GLYPH_RATIO, stravaColor)} aria-hidden="true" />
    </Circle>
  </span>
);
