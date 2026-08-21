// Composite mark: Strava + link + bike, drawn side by side. The Strava and bike
// marks each sit in their own circle; the link sits bare between them. Every
// layer is its own inlined svg, so a caller can tint the parts independently.
import type { FunctionComponent, ReactNode, SVGProps } from "react";
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

// The three sources have different aspect ratios, so each is sized by height
// only and left to keep its own width.
const layerProps: SVGProps<SVGSVGElement> = { width: "auto" };

// The glyph takes this share of the circle it sits in, leaving the rest as padding.
const GLYPH_RATIO = 0.65;

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
  <span className={`inline-flex items-center gap-1 ${className ?? ""}`}>
    <Circle size={size} background={stravaCircleColor}>
      <StravaMark {...layerProps} height={size * GLYPH_RATIO} style={{ color: stravaColor }} aria-hidden="true" />
    </Circle>
    <ConnectMark {...layerProps} height={size * 0.7} style={{ color: connectColor }} aria-hidden="true" />
    <Circle size={size} background={bikeCircleColor}>
      <BikeMark
        {...layerProps}
        height={size * GLYPH_RATIO}
        style={{ color: bikeColor }}
        aria-hidden="true"
      />
    </Circle>
  </span>
);
