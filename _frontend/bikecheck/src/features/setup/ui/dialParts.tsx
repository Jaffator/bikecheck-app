// SVG lettering every front-view dial is drawn with: lines and text placed in the polar frame
// of dialGeometry, an arc arrow, and the style that shows a ring's focus outline on keyboard only.
import type { ReactElement, ReactNode, SVGProps } from "react";
import { FOCUS_CLASS, RING_CLASS } from "../dialEngine";
import { fmt, polar, type ArrowGeom } from "../dialGeometry";

export const DIAL_FONT = "Archivo, system-ui, sans-serif";
// The off-white every dial is lettered in.
export const INK = "#f4f4f5";

interface RadialLineProps extends SVGProps<SVGLineElement> {
  r1: number;
  r2: number;
  deg: number;
}

// A line along one radius, from r1 to r2.
export function RadialLine({ r1, r2, deg, ...rest }: RadialLineProps): ReactElement {
  const [x1, y1] = polar(r1, deg);
  const [x2, y2] = polar(r2, deg);
  return <line x1={fmt(x1)} y1={fmt(y1)} x2={fmt(x2)} y2={fmt(y2)} {...rest} />;
}

interface PolarTextProps extends SVGProps<SVGTextElement> {
  r: number;
  deg: number;
  size: number;
  children: ReactNode;
}

// Text centred on a polar point.
export function PolarText({ r, deg, size, children, ...rest }: PolarTextProps): ReactElement {
  const [x, y] = polar(r, deg);
  return (
    <text
      x={fmt(x)}
      y={fmt(y)}
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily={DIAL_FONT}
      fontWeight={700}
      fontSize={size}
      fill={INK}
      {...rest}
    >
      {children}
    </text>
  );
}

interface ArcTextProps {
  // Id reference of an arc in the dial's <defs>.
  href: string;
  size: number;
  spacing?: number;
  weight?: number;
  children: ReactNode;
}

// Text running along an arc, centred on it.
export function ArcText({ href, size, spacing = 1, weight = 700, children }: ArcTextProps): ReactElement {
  return (
    <text fontFamily={DIAL_FONT} fontWeight={weight} fontSize={size} fill={INK} letterSpacing={spacing}>
      <textPath href={href} xlinkHref={href} startOffset="50%" textAnchor="middle">
        {children}
      </textPath>
    </text>
  );
}

interface ArcArrowProps {
  geom: ArrowGeom;
  color?: string;
  width?: number;
  opacity?: number;
}

// A curved arrow: the shaft and an open ">" head.
export function ArcArrow({ geom, color = "#c9ccd1", width = 1.5, opacity = 1 }: ArcArrowProps): ReactElement {
  const stroke = {
    fill: "none",
    stroke: color,
    strokeWidth: width,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    opacity,
  };
  return (
    <>
      <path d={geom.shaft} {...stroke} />
      <polyline points={geom.head} {...stroke} />
    </>
  );
}

// The focus outline shows on keyboard focus only; a pressed ring shows a grabbing hand.
export function DialFocusStyle(): ReactElement {
  return (
    <style>
      {`.${RING_CLASS} .${FOCUS_CLASS}{opacity:0}.${RING_CLASS}:focus-visible .${FOCUS_CLASS}{opacity:1}.${RING_CLASS}:active{cursor:grabbing}`}
    </style>
  );
}
