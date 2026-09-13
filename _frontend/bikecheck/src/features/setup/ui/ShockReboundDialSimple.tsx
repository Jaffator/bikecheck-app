// The single red knurled rebound knob of a shock, seen from the side: one LSR cylinder with six
// smooth flutes and its code engraved on a band that turns with it, and the SLOW/FAST arrows
// under it. One click is one flute. A sideways drag turns it; wheel, arrows, PageUp/PageDown,
// Home and End work too; plus and minus buttons belong to the screen.
import type { ReactElement } from "react";
import type { ReboundRing, SimpleReboundDialProps } from "../dial.types";
import { DIAL_SVG_STYLE, FOCUS_CLASS, sideRing, useDialEngine, type RingGroupProps } from "../dialEngine";
import { TAU } from "../dialGeometry";
import { DIAL_FONT, DialFocusStyle } from "./dialParts";

const RING: ReboundRing = "lsr";
// Radius and height of the cylinder; the drawing is local to its top centre.
const R = 120;
const H = 122;
const CX = 160;
const TOP = 12;
// Knurling: ridge count, helix twist in radians, vertical range, samples down one ridge.
const KNURL = { n: 64, helix: 0.45, y0: 8, y1: H - 8, samples: 7 };
// Smooth flutes: count, half angular width in radians, vertical range.
const FLUTES = { n: 6, halfWidth: 0.11, y0: 14, y1: H - 14 };
// The smooth band the code is engraved on.
const BAND = { y0: 42, y1: 80, font: 26 };
const LABEL = "LSR";
// One click per flute, so the flutes line up with the detents.
const CLICKS_PER_TURN = FLUTES.n;
const CHAMFER = 6;
const EDGE = 34;
const HINT_Y = TOP + H + 31;
const VIEW_HEIGHT = HINT_Y + 25;
const HINT_COLOR = "#c9ccd1";

const RIDGE_PHI = Array.from({ length: KNURL.n }, (_, i) => (i / KNURL.n) * TAU);
const FLUTE_PHI = Array.from({ length: FLUTES.n }, (_, i) => (i / FLUTES.n) * TAU);
// Angular pitch of the letters: arc length over the radius.
const LETTER_STEP = (BAND.font * 0.8) / R;
// The code printed twice, on opposite sides, so one copy is always facing out.
const LETTER_THETA: number[] = [0, Math.PI].flatMap((phase) =>
  [...LABEL].map((_, j) => phase + (j - (LABEL.length - 1) / 2) * LETTER_STEP),
);

const fmt = (n: number): string => n.toFixed(2);

// Whether a point on the surface, at `psi` from the front, falls into a flute.
function inFlute(psi: number, angle: number): boolean {
  for (const phi of FLUTE_PHI) {
    let d = (psi - (angle + phi)) % TAU;
    if (d > Math.PI) d -= TAU;
    else if (d < -Math.PI) d += TAU;
    if (Math.abs(d) < FLUTES.halfWidth) return true;
  }
  return false;
}

// One ridge as a helix on the visible half of the cylinder: thinner and fainter toward the
// edge, hidden where it turns away and broken where it crosses a flute.
function setRidge(node: SVGPathElement, base: number, twist: number, angle: number): void {
  let d = "";
  let pen = false;
  let sum = 0;
  let n = 0;
  for (let k = 0; k <= KNURL.samples; k++) {
    const t = k / KNURL.samples;
    const psi = angle + base + twist * (t - 0.5);
    const c = Math.cos(psi);
    if (c <= 0.03 || inFlute(psi, angle)) {
      pen = false;
      continue;
    }
    d += (pen ? "L" : "M") + fmt(R * Math.sin(psi)) + " " + fmt(KNURL.y0 + (KNURL.y1 - KNURL.y0) * t);
    pen = true;
    sum += c;
    n++;
  }
  const mean = n ? sum / n : 0;
  node.setAttribute("d", d);
  node.setAttribute("opacity", mean.toFixed(3));
  node.setAttribute("stroke-width", (0.35 + 1.5 * mean).toFixed(2));
}

// A flute foreshortened by where it stands on the cylinder; gone once it turns behind.
function setFlute(node: SVGRectElement, phi: number, angle: number): void {
  const psi = angle + phi;
  const c = Math.cos(psi);
  if (c <= 0.1) {
    node.setAttribute("opacity", "0");
    return;
  }
  const x1 = R * Math.sin(psi - FLUTES.halfWidth);
  const x2 = R * Math.sin(psi + FLUTES.halfWidth);
  node.setAttribute("x", fmt(Math.min(x1, x2)));
  node.setAttribute("width", fmt(Math.max(0.5, Math.abs(x2 - x1))));
  node.setAttribute("opacity", Math.min(1, 0.15 + c).toFixed(3));
}

// A letter wrapped round the cylinder: squeezed by cos, fainter toward the edge.
function setLetter(node: SVGTextElement, theta: number, angle: number): void {
  const psi = angle + theta;
  const c = Math.cos(psi);
  if (c <= 0.05) {
    node.setAttribute("opacity", "0");
    return;
  }
  node.setAttribute("transform", `translate(${fmt(R * Math.sin(psi))} 0) scale(${c.toFixed(3)} 1)`);
  node.setAttribute("opacity", Math.min(1, 0.25 + c).toFixed(3));
}

// Redraws the knob inside `node` turned to `angle`: light and dark ridges interleaved, the
// flutes, then the lettering. The nodes are found by their data attributes.
function drawKnob(node: SVGGElement, angle: number): void {
  const light = node.querySelectorAll<SVGPathElement>('[data-ridge="light"]');
  const dark = node.querySelectorAll<SVGPathElement>('[data-ridge="dark"]');
  RIDGE_PHI.forEach((phi, i) => {
    setRidge(light[i], phi, KNURL.helix, angle);
    setRidge(dark[i], phi + Math.PI / KNURL.n, -KNURL.helix, angle);
  });
  const flutes = node.querySelectorAll<SVGRectElement>("[data-flute]");
  FLUTE_PHI.forEach((phi, i) => setFlute(flutes[i], phi, angle));
  const letters = node.querySelectorAll<SVGTextElement>("[data-letter]");
  LETTER_THETA.forEach((theta, i) => setLetter(letters[i], theta, angle));
}

interface KnobProps {
  groupProps: RingGroupProps;
  url: (name: string) => string;
}

// The static drawing of the knob; the engine turns it through drawKnob.
function Knob({ groupProps, url }: KnobProps): ReactElement {
  return (
    <g transform={`translate(${CX} ${TOP})`}>
      <g {...groupProps}>
        <g filter={url("drop")}>
          <g clipPath={url("clip")}>
            {/* Turning: anodised body, knurl, flutes, the band with its lettering */}
            <rect x={-R} y={0} width={2 * R} height={H} fill={url("anod")} />
            <g fill="none" strokeLinecap="round">
              {RIDGE_PHI.map((_, i) => (
                <g key={i}>
                  <path data-ridge="light" stroke="#ffd0d8" strokeOpacity={0.42} />
                  <path data-ridge="dark" stroke="#2a0309" strokeOpacity={0.5} />
                </g>
              ))}
            </g>
            {FLUTE_PHI.map((_, i) => (
              <rect key={i} data-flute y={FLUTES.y0} height={FLUTES.y1 - FLUTES.y0} rx={5} fill={url("flute")} />
            ))}
            <rect x={-R} y={BAND.y0} width={2 * R} height={BAND.y1 - BAND.y0} fill={url("anod")} />
            <rect x={-R} y={BAND.y0} width={2 * R} height={BAND.y1 - BAND.y0} fill={url("band")} />
            <g
              fontFamily={DIAL_FONT}
              fontWeight={900}
              fontSize={BAND.font}
              fill="#fff"
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                paintOrder: "stroke",
                stroke: "rgba(40,0,6,0.6)",
                strokeWidth: 1.6,
              }}
            >
              {LETTER_THETA.map((_, i) => (
                <text key={i} data-letter y={(BAND.y0 + BAND.y1) / 2 + 1}>
                  {LABEL[i % LABEL.length]}
                </text>
              ))}
            </g>

            {/* Fixed: chamfers, the specular and the darkened edges do not turn with the knob */}
            <rect x={-R} y={0} width={2 * R} height={CHAMFER} fill={url("chamfer")} opacity={0.85} />
            <rect x={-R} y={H - CHAMFER} width={2 * R} height={CHAMFER} fill={url("chamfer")} opacity={0.7} />
            <rect x={-R * 0.5} y={0} width={R * 0.15} height={H} fill="#fff" opacity={0.09} />
            <rect x={-R} y={0} width={EDGE} height={H} fill={url("edgeL")} />
            <rect x={R - EDGE} y={0} width={EDGE} height={H} fill={url("edgeR")} />
          </g>
        </g>
        <rect
          className={FOCUS_CLASS}
          x={-R - 4}
          y={-4}
          width={2 * R + 8}
          height={H + 8}
          rx={9}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          pointerEvents="none"
        />
      </g>
    </g>
  );
}

// Arrows to either side under the knob: left toward SLOW and the closed stop, right toward FAST.
function DirectionHint(): ReactElement {
  const x0 = CX - R;
  const x1 = CX + R;
  const pad = 10;
  const gap = 8;
  const y = HINT_Y;
  return (
    <g
      fontFamily={DIAL_FONT}
      fontWeight={700}
      fontSize={18}
      letterSpacing="0.08em"
      fill={HINT_COLOR}
      stroke={HINT_COLOR}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      pointerEvents="none"
    >
      <path fill="none" d={`M${x0 + pad + 8} ${y - 7} L${x0 + pad} ${y} L${x0 + pad + 8} ${y + 7}`} />
      <text x={x0 + pad + 8 + gap} y={y} textAnchor="start" stroke="none" dominantBaseline="central">
        + SLOW
      </text>
      <text x={x1 - pad - 8 - gap} y={y} textAnchor="end" stroke="none" dominantBaseline="central">
        FAST −
      </text>
      <path fill="none" d={`M${x1 - pad - 8} ${y - 7} L${x1 - pad} ${y} L${x1 - pad - 8} ${y + 7}`} />
    </g>
  );
}

export function ShockReboundDialSimple({
  lsr,
  ariaLabel,
  haptics = true,
  onActive,
  readOnly = false,
  className,
  style,
}: SimpleReboundDialProps): ReactElement {
  // Clockwise: a drag to the left, toward SLOW, closes the damper and stops at fully closed;
  // to the right, toward FAST, it opens with no end stop (ADR 0029).
  const { svgProps, ringProps, defId, defUrl } = useDialEngine(
    [
      {
        ...lsr,
        key: RING,
        ...sideRing(CX, TOP, H, R),
        clicksPerTurn: lsr.clicksPerTurn ?? CLICKS_PER_TURN,
        draw: (angle, node) => drawKnob(node, angle),
        onActive: () => onActive?.(RING),
      },
    ],
    "cw",
    haptics,
    readOnly,
  );

  return (
    <svg
      viewBox={`0 0 320 ${VIEW_HEIGHT}`}
      {...svgProps}
      className={className}
      role="group"
      aria-label={ariaLabel}
      style={{ ...DIAL_SVG_STYLE, ...style }}
    >
      <defs>
        <clipPath id={defId("clip")}>
          <rect x={-R} y={0} width={2 * R} height={H} rx={6} />
        </clipPath>
        <linearGradient id={defId("anod")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3a050e" />
          <stop offset="0.12" stopColor="#8f0f26" />
          <stop offset="0.30" stopColor="#ee4a66" />
          <stop offset="0.46" stopColor="#d5173a" />
          <stop offset="0.72" stopColor="#a5122b" />
          <stop offset="0.90" stopColor="#5e0a19" />
          <stop offset="1" stopColor="#2a0409" />
        </linearGradient>
        <linearGradient id={defId("chamfer")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2a0409" />
          <stop offset="0.3" stopColor="#ff8aa0" />
          <stop offset="0.5" stopColor="#b8142f" />
          <stop offset="1" stopColor="#2a0409" />
        </linearGradient>
        <linearGradient id={defId("flute")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity={0.6} />
          <stop offset="0.18" stopColor="#000" stopOpacity={0.12} />
          <stop offset="0.45" stopColor="#fff" stopOpacity={0.14} />
          <stop offset="0.8" stopColor="#000" stopOpacity={0.18} />
          <stop offset="1" stopColor="#000" stopOpacity={0.6} />
        </linearGradient>
        <linearGradient id={defId("band")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity={0.45} />
          <stop offset="0.12" stopColor="#000" stopOpacity={0.05} />
          <stop offset="0.88" stopColor="#000" stopOpacity={0.05} />
          <stop offset="1" stopColor="#fff" stopOpacity={0.18} />
        </linearGradient>
        <linearGradient id={defId("edgeL")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity={0.75} />
          <stop offset="1" stopColor="#000" stopOpacity={0} />
        </linearGradient>
        <linearGradient id={defId("edgeR")} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity={0.75} />
          <stop offset="1" stopColor="#000" stopOpacity={0} />
        </linearGradient>
        <filter id={defId("drop")} x="-10%" y="-20%" width="120%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#000" floodOpacity={0.55} />
        </filter>
      </defs>
      <DialFocusStyle />

      <Knob groupProps={ringProps(RING)} url={defUrl} />
      <DirectionHint />
    </svg>
  );
}
