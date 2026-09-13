// The single-adjuster rebound knob seen from the side, hanging off the fork leg: the shaft on
// top and the LSR knob with its end cap under it. A sideways drag turns it; the ridges and the
// lettering rotate while the shading stays where the light is. Wheel, arrows, PageUp/PageDown,
// Home and End work too; plus and minus buttons belong to the screen.
import type { ReactElement } from "react";
import type { ReboundRing, SimpleReboundDialProps } from "../dial.types";
import { DIAL_SVG_STYLE, FOCUS_CLASS, sideRing, useDialEngine, type RingGroupProps } from "../dialEngine";
import { TAU } from "../dialGeometry";
import { DIAL_FONT, DialFocusStyle } from "./dialParts";

// One letter of the label, at its angle round the cylinder.
interface Letter {
  ch: string;
  theta: number;
}

interface LetterLayout {
  fontSize: number;
  y: number;
  letters: Letter[];
}

// 30 degrees a click.
const CLICKS_PER_TURN = 12;
// Points a ridge is sampled at down the ring's height.
const HELIX_SAMPLES = 7;

const RING: ReboundRing = "lsr";
const CX = 160;
const TOP = 52;
const HEIGHT = 150;
const RADIUS = 100;
const LABEL = "+LSR−";
const RIDGES = 56;
// Radians of twist across the ring's height, so the ridges read as a helix.
const HELIX = 0.5;
const CAP_RY = RADIUS * 0.11;
const CHAMFER = Math.max(4, RADIUS * 0.06);

// The label - plus, code, minus, the plus being the fully-closed end stop - is printed twice, on
// opposite sides, so one copy is always facing out.
function layoutLetters(): LetterLayout {
  const fontSize = Math.round(HEIGHT * 0.26);
  const stepTheta = (fontSize * 0.78) / RADIUS;
  const letters: Letter[] = [];
  for (const phase of [0, Math.PI]) {
    for (let j = 0; j < LABEL.length; j++) {
      letters.push({
        ch: LABEL[j],
        theta: phase + (j - (LABEL.length - 1) / 2) * stepTheta,
      });
    }
  }
  return { fontSize, y: TOP + HEIGHT / 2 + fontSize * 0.36, letters };
}

const LETTERS = layoutLetters();

// One ridge as a helix on the visible half of the cylinder; hidden where it turns away.
function setRidge(node: SVGPathElement, base: number, twist: number, light: boolean): void {
  const y0 = TOP + 4;
  const y1 = TOP + HEIGHT - 4;
  let d = "";
  let pen = false;
  let sum = 0;
  let n = 0;
  for (let k = 0; k <= HELIX_SAMPLES; k++) {
    const t = k / HELIX_SAMPLES;
    const th = base + twist * (t - 0.5);
    const c = Math.cos(th);
    if (c <= 0.03) {
      pen = false;
      continue;
    }
    const x = CX + RADIUS * Math.sin(th);
    const y = y0 + (y1 - y0) * t;
    d += (pen ? "L" : "M") + x.toFixed(2) + " " + y.toFixed(2);
    pen = true;
    sum += c;
    n++;
  }
  const mean = n ? sum / n : 0;
  node.setAttribute("d", d);
  node.setAttribute("opacity", mean.toFixed(3));
  node.setAttribute("stroke-width", (0.35 + 1.5 * mean).toFixed(2));
  node.setAttribute("stroke-opacity", light ? "0.42" : "0.5");
}

// A letter foreshortened by where it stands on the cylinder; gone once it turns behind.
function setLetter(node: SVGTextElement, theta: number): void {
  const c = Math.cos(theta);
  if (c <= 0.04) {
    node.setAttribute("opacity", "0");
    return;
  }
  const x = CX + RADIUS * Math.sin(theta);
  node.setAttribute("transform", `translate(${x.toFixed(2)} 0) scale(${c.toFixed(3)} 1)`);
  node.setAttribute("opacity", Math.min(1, 0.25 + c).toFixed(3));
}

// Redraws the ring inside `node` turned to `angle`: light and dark ridges interleaved, then the
// lettering. The nodes are found by their data attributes, so nothing is registered in React.
function drawRing(node: SVGGElement, angle: number): void {
  const light = node.querySelectorAll<SVGPathElement>('[data-ridge="light"]');
  const dark = node.querySelectorAll<SVGPathElement>('[data-ridge="dark"]');
  for (let i = 0; i < RIDGES; i++) {
    const base = (i / RIDGES) * TAU + angle;
    setRidge(light[i], base, HELIX, true);
    setRidge(dark[i], base + Math.PI / RIDGES, -HELIX, false);
  }
  const letters = node.querySelectorAll<SVGTextElement>("[data-letter]");
  LETTERS.letters.forEach((l, i) => setLetter(letters[i], l.theta + angle));
}

interface SideRingProps {
  groupProps: RingGroupProps;
  url: (name: string) => string;
}

// The static drawing of the ring; the engine turns it through drawRing.
function SideRing({ groupProps, url }: SideRingProps): ReactElement {
  const { fontSize, y: textY, letters } = LETTERS;
  const ridgeIndexes = Array.from({ length: RIDGES }, (_, i) => i);

  return (
    <g {...groupProps}>
      <ellipse cx={CX} cy={TOP + HEIGHT} rx={RADIUS} ry={CAP_RY} fill={url("cap")} />
      <ellipse
        cx={CX}
        cy={TOP + HEIGHT}
        rx={RADIUS * 0.72}
        ry={CAP_RY * 0.72}
        fill="none"
        stroke="#000"
        strokeOpacity={0.25}
        strokeWidth={1.2}
      />
      <rect x={CX - RADIUS} y={TOP} width={2 * RADIUS} height={HEIGHT} fill={url("anod")} />

      <g strokeLinecap="round" fill="none">
        {ridgeIndexes.map((i) => (
          <g key={i}>
            <path data-ridge="light" stroke="#ffd0d8" />
            <path data-ridge="dark" stroke="#2a0309" />
          </g>
        ))}
      </g>

      <rect x={CX - RADIUS} y={TOP} width={2 * RADIUS} height={CHAMFER} fill={url("chamfer")} opacity={0.85} />
      <rect
        x={CX - RADIUS}
        y={TOP + HEIGHT - CHAMFER}
        width={2 * RADIUS}
        height={CHAMFER}
        fill={url("chamfer")}
        opacity={0.7}
      />
      <rect x={CX - RADIUS} y={TOP} width={2 * RADIUS} height={HEIGHT * 0.3} fill={url("dropShade")} />

      <g
        fontFamily={DIAL_FONT}
        fontWeight={800}
        fontSize={fontSize}
        fill="#fff"
        textAnchor="middle"
        style={{
          paintOrder: "stroke",
          stroke: "rgba(40,0,6,0.55)",
          strokeWidth: 1.5,
        }}
      >
        {letters.map((l, i) => (
          <text key={i} data-letter y={textY}>
            {l.ch}
          </text>
        ))}
      </g>

      {/* Fixed highlight: the light does not turn with the knob */}
      <rect x={CX - RADIUS * 0.48} y={TOP} width={RADIUS * 0.16} height={HEIGHT} fill="#fff" opacity={0.1} />
      <rect
        className={FOCUS_CLASS}
        x={CX - RADIUS - 5}
        y={TOP - 5}
        width={2 * RADIUS + 10}
        height={HEIGHT + CAP_RY + 10}
        rx={8}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        pointerEvents="none"
      />
    </g>
  );
}

export function ForkReboundDialSimple({
  lsr,
  ariaLabel,
  haptics = true,
  onActive,
  readOnly = false,
  className,
  style,
}: SimpleReboundDialProps): ReactElement {
  // Clockwise: a drag to the left, toward the plus, closes the damper and stops at fully
  // closed; to the right, toward the minus, it opens with no end stop (ADR 0029).
  const { svgProps, ringProps, defId, defUrl } = useDialEngine(
    [
      {
        ...lsr,
        key: RING,
        ...sideRing(CX, TOP, HEIGHT + CAP_RY, RADIUS),
        clicksPerTurn: lsr.clicksPerTurn ?? CLICKS_PER_TURN,
        draw: (angle, node) => drawRing(node, angle),
        onActive: () => onActive?.(RING),
      },
    ],
    "cw",
    haptics,
    readOnly,
  );

  return (
    <svg
      viewBox="0 0 320 320"
      {...svgProps}
      className={className}
      role="group"
      aria-label={ariaLabel}
      style={{ ...DIAL_SVG_STYLE, ...style }}
    >
      <defs>
        <linearGradient id={defId("anod")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#4d0713" />
          <stop offset="0.14" stopColor="#a3122a" />
          <stop offset="0.30" stopColor="#f0506c" />
          <stop offset="0.46" stopColor="#d5173a" />
          <stop offset="0.72" stopColor="#a5122b" />
          <stop offset="0.90" stopColor="#6a0b1c" />
          <stop offset="1" stopColor="#3a050e" />
        </linearGradient>
        <radialGradient id={defId("cap")} cx="0.35" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#ff7d95" />
          <stop offset="0.5" stopColor="#d5173a" />
          <stop offset="1" stopColor="#6a0b1c" />
        </radialGradient>
        <linearGradient id={defId("chamfer")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#2a0409" />
          <stop offset="0.3" stopColor="#ff8aa0" />
          <stop offset="0.5" stopColor="#b8142f" />
          <stop offset="1" stopColor="#2a0409" />
        </linearGradient>
        <linearGradient id={defId("dropShade")} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity={0.45} />
          <stop offset="1" stopColor="#000" stopOpacity={0} />
        </linearGradient>
        <linearGradient id={defId("steel")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#1a1b1d" />
          <stop offset="0.3" stopColor="#4a4d52" />
          <stop offset="0.5" stopColor="#2c2e31" />
          <stop offset="1" stopColor="#101112" />
        </linearGradient>
        <filter id={defId("shadow")} x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#000" floodOpacity={0.55} />
        </filter>
      </defs>
      <DialFocusStyle />

      {/* The shaft the knob hangs from */}
      <rect x={112} y={0} width={96} height={56} rx={6} fill={defUrl("steel")} />
      <g filter={defUrl("shadow")}>
        <SideRing groupProps={ringProps(RING)} url={defUrl} />
      </g>
    </svg>
  );
}
