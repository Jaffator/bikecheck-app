// An unbranded compression knob seen from the front, drawn for any fork or shock that is not a
// Fox or a RockShox (ADR 0029). The outer graphite ring is HSC, the inner knob with the accent
// collar is LSC. Drag round the ring, wheel over it, or use the arrows, PageUp/PageDown, Home
// and End; plus and minus buttons belong to the screen.
import type { ReactElement } from "react";
import type { CompressionDialProps } from "../dial.types";
import { DIAL_SVG_STYLE, FOCUS_CLASS, radialRing, useDialEngine } from "../dialEngine";
import { arcArrowGeom, arcPath, CX, CY, hexPoints, wavyCircle } from "../dialGeometry";
import { ArcArrow, ArcText, DialFocusStyle, PolarText, RadialLine } from "./dialParts";

export interface GenericCompressionDialProps extends CompressionDialProps {
  // Colour of the LSC collar, e.g. a brand colour; silver by default.
  accent?: string;
}

// Clicks per turn: HSC 30 degrees a click, LSC 18; the LSC face carries one tick per click.
const HSC_CLICKS_PER_TURN = 12;
const LSC_TICKS = 20;
// Where the HSC ring ends and the LSC knob begins.
const LSC_RADIUS = 104;
const DEFAULT_ACCENT = "#9aa0a8";

const HSC_EDGE = wavyCircle(152, 3.5, 72, 1.3);
const ARC_HSC = arcPath(127, 198, 162, false);
const ARC_LSC = arcPath(90, 200, 160, false);
const LSC_TICK_INDEXES = Array.from({ length: LSC_TICKS }, (_, i) => i).filter((i) => i > 0);

// Tints `hex` towards `target` by `t` (0..1), so one accent colour yields the whole collar.
function mix(hex: string, target: string, t: number): string {
  const channels = (s: string): number[] => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const long = hex.length === 4 ? "#" + [...hex.slice(1)].map((ch) => ch + ch).join("") : hex;
  const a = channels(long);
  const b = channels(target);
  return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

export function GenericCompressionDial({
  hsc,
  lsc,
  ariaLabel,
  direction = "cw",
  accent = DEFAULT_ACCENT,
  haptics = true,
  onActive,
  readOnly = false,
  className,
  style,
}: GenericCompressionDialProps): ReactElement {
  const { svgProps, ringProps, defId, defUrl } = useDialEngine(
    [
      {
        ...hsc,
        key: "hsc",
        ...radialRing(LSC_RADIUS, 160),
        clicksPerTurn: hsc.clicksPerTurn ?? HSC_CLICKS_PER_TURN,
        onActive: () => onActive?.("hsc"),
      },
      {
        ...lsc,
        key: "lsc",
        ...radialRing(0, LSC_RADIUS),
        clicksPerTurn: lsc.clicksPerTurn ?? LSC_TICKS,
        onActive: () => onActive?.("lsc"),
      },
    ],
    direction,
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
        <radialGradient id={defId("crown")} cx="0.38" cy="0.30" r="0.78">
          <stop offset="0" stopColor="#4a4d52" />
          <stop offset="0.55" stopColor="#25272b" />
          <stop offset="1" stopColor="#0c0d0f" />
        </radialGradient>
        <radialGradient id={defId("hscFace")}>
          <stop offset="0" stopColor="#17181b" />
          <stop offset="0.7" stopColor="#151618" />
          <stop offset="0.97" stopColor="#1d1e22" />
          <stop offset="1" stopColor="#101113" />
        </radialGradient>
        <radialGradient id={defId("lscFace")}>
          <stop offset="0" stopColor="#1d1e22" />
          <stop offset="0.82" stopColor="#121316" />
          <stop offset="1" stopColor="#050607" />
        </radialGradient>
        <radialGradient id={defId("accentRing")}>
          <stop offset="0.68" stopColor={mix(accent, "#000000", 0.75)} />
          <stop offset="0.73" stopColor={mix(accent, "#ffffff", 0.6)} />
          <stop offset="0.85" stopColor={accent} />
          <stop offset="0.95" stopColor={mix(accent, "#000000", 0.4)} />
          <stop offset="1" stopColor={mix(accent, "#000000", 0.78)} />
        </radialGradient>
        <radialGradient id={defId("hub")}>
          <stop offset="0" stopColor="#3c3e44" />
          <stop offset="0.8" stopColor="#1b1c20" />
          <stop offset="1" stopColor="#0d0e10" />
        </radialGradient>
        <linearGradient id={defId("sheen")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={0.26} />
          <stop offset="0.4" stopColor="#fff" stopOpacity={0} />
          <stop offset="0.62" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.45} />
        </linearGradient>
        <linearGradient id={defId("bevel")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={0.65} />
          <stop offset="0.5" stopColor="#fff" stopOpacity={0.05} />
          <stop offset="1" stopColor="#000" stopOpacity={0.7} />
        </linearGradient>
        <radialGradient id={defId("well")}>
          <stop offset="0.84" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.6} />
        </radialGradient>
        <filter id={defId("drop")} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000" floodOpacity={0.6} />
        </filter>
        <path id={defId("arcHSC")} d={ARC_HSC} fill="none" />
        <path id={defId("arcLSC")} d={ARC_LSC} fill="none" />
      </defs>
      <DialFocusStyle />

      {/* Crown and the gap around the knob */}
      <circle cx={CX} cy={CY} r={178} fill={defUrl("crown")} />
      <circle cx={CX} cy={CY} r={158} fill="#07080a" />

      <g filter={defUrl("drop")}>
        {/* HSC: the outer ring */}
        <g {...ringProps("hsc")}>
          <path d={HSC_EDGE} fill="#1c1d20" />
          <circle cx={CX} cy={CY} r={146} fill={defUrl("hscFace")} />
          <RadialLine r1={108} r2={150} deg={0} stroke="#fff" strokeWidth={3} strokeLinecap="round" />
          <ArcText href={`#${defId("arcHSC")}`} size={12} spacing={1.5}>
            HSC
          </ArcText>
          <PolarText r={125} deg={-119} size={15}>
            −
          </PolarText>
          <ArcArrow geom={arcArrowGeom(125, 226, 233)} opacity={0.9} />
          <PolarText r={125} deg={119} size={15}>
            +
          </PolarText>
          <ArcArrow geom={arcArrowGeom(125, 134, 127)} opacity={0.9} />
          <rect
            className={FOCUS_CLASS}
            x={CX - 156}
            y={CY - 156}
            width={312}
            height={312}
            rx={156}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            pointerEvents="none"
          />
        </g>

        {/* LSC: the inner knob */}
        <g {...ringProps("lsc")}>
          <circle cx={CX} cy={CY} r={LSC_RADIUS} fill={defUrl("lscFace")} />
          {LSC_TICK_INDEXES.map((i) => (
            <RadialLine
              key={i}
              r1={66}
              r2={76}
              deg={(i * 360) / LSC_TICKS}
              stroke="#fff"
              strokeOpacity={0.85}
              strokeWidth={1.6}
              strokeLinecap="round"
            />
          ))}
          <RadialLine r1={60} r2={98} deg={0} stroke="#fff" strokeWidth={3} strokeLinecap="round" />
          <PolarText r={88} deg={232} size={15}>
            +
          </PolarText>
          <ArcArrow geom={arcArrowGeom(88, 247, 240)} opacity={0.9} />
          <PolarText r={88} deg={128} size={15}>
            −
          </PolarText>
          <ArcArrow geom={arcArrowGeom(88, 113, 120)} opacity={0.9} />
          <ArcText href={`#${defId("arcLSC")}`} size={12} spacing={1.5}>
            LSC
          </ArcText>
          <circle cx={CX} cy={CY} r={44} fill={defUrl("accentRing")} />
          <circle cx={CX} cy={CY} r={31} fill={defUrl("hub")} />
          <polygon points={hexPoints(10)} fill="#05060a" stroke="#2b2d33" strokeWidth={1} />
          <circle
            className={FOCUS_CLASS}
            cx={CX}
            cy={CY}
            r={100}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            pointerEvents="none"
          />
        </g>
      </g>

      {/* Static light and edges; the light does not turn with the knob */}
      <g pointerEvents="none">
        <circle cx={CX} cy={CY} r={LSC_RADIUS} fill={defUrl("well")} />
        <circle cx={CX} cy={CY} r={31} fill={defUrl("well")} />
        <circle cx={CX} cy={CY} r={152} fill={defUrl("sheen")} />
        <circle cx={CX} cy={CY} r={150.5} fill="none" stroke={defUrl("bevel")} strokeWidth={3} opacity={0.8} />
        <circle cx={CX} cy={CY} r={44} fill="none" stroke={defUrl("bevel")} strokeWidth={1.5} opacity={0.7} />
        <polygon points={`${CX},${CY - 153} ${CX - 4.5},${CY - 163} ${CX + 4.5},${CY - 163}`} fill="#fff" />
      </g>
    </svg>
  );
}
