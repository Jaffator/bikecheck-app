// A single compression knob seen from the front, for a damper with one adjuster: the LSC knob
// of the generic dial grown to fill the crown, with its accent collar and hub. A Fox or
// RockShox part stamps its wordmark under the hub; a Fox knob is anodised in its blue. Drag round it, wheel over it, or use the arrows, PageUp/PageDown, Home and End; plus
// and minus buttons belong to the screen.
import type { ReactElement } from "react";
import type { CompressionRing, SimpleCompressionDialProps } from "../dial.types";
import type { DialBrand } from "../dialBrand";
import { DIAL_SVG_STYLE, FOCUS_CLASS, radialRing, useDialEngine } from "../dialEngine";
import { arcArrowGeom, arcPath, CX, CY, hexPoints } from "../dialGeometry";
import { FoxLogo, RockShoxLogo } from "./dialLogos";
import { ArcArrow, ArcText, DialFocusStyle, PolarText, RadialLine } from "./dialParts";

const RING: CompressionRing = "lsc";
// Clicks per full turn of the knob.
const LSC_TICKS = 20;
const KNOB_RADIUS = 146;
const ACCENT = "#9aa0a8";
// A breath of blue over the black face, so it leans towards the branded LSC knobs.
const TINT = "#2f7de0";
const TINT_STRENGTH = 0.15;
// The whole Fox knob in the blue of its GRIP ring.
const FOX_BLUE = "#2560d6";

const ARC_LSC = arcPath(126, 200, 160, false);
// The wordmarks centred in the band between the collar and the LSC lettering.
const FOX_LOGO_TR = "translate(131.486 222.4) scale(0.2958)";
const RS_LOGO_TR = "translate(116.1 205.9) scale(0.1371)";

// Tints `hex` towards `target` by `t` (0..1), so one accent colour yields the whole collar.
function mix(hex: string, target: string, t: number): string {
  const channels = (s: string): number[] => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const a = channels(hex);
  const b = channels(target);
  return (
    "#" +
    a
      .map((v, i) =>
        Math.round(v + (b[i] - v) * t)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

interface BrandedSimpleCompressionDialProps extends SimpleCompressionDialProps {
  brand: DialBrand;
}

export function CompressionDialSimple({
  brand,
  lsc,
  ariaLabel,
  direction = "cw",
  haptics = true,
  onActive,
  readOnly = false,
  className,
  style,
}: BrandedSimpleCompressionDialProps): ReactElement {
  // Face stops from the centre out: black with a breath of blue, or Fox blue through and through.
  const face =
    brand === "fox"
      ? [mix(FOX_BLUE, "#ffffff", 0.15), FOX_BLUE, mix(FOX_BLUE, "#000000", 0.12)]
      : [mix("#1d1e22", TINT, TINT_STRENGTH), mix("#121316", TINT, TINT_STRENGTH), mix("#050607", TINT, TINT_STRENGTH)];
  const { svgProps, ringProps, defId, defUrl } = useDialEngine(
    [
      {
        ...lsc,
        key: RING,
        ...radialRing(0, 160),
        clicksPerTurn: lsc.clicksPerTurn ?? LSC_TICKS,
        onActive: () => onActive?.(RING),
      },
    ],
    direction,
    haptics,
    readOnly,
  );

  return (
    <svg
      // The frame is 10% wider than the 320 drawing, so the knob fills 90% of the box.
      viewBox="-18 -18 356 356"
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
        <radialGradient id={defId("face")}>
          <stop offset="0" stopColor={face[0]} />
          <stop offset="0.82" stopColor={face[1]} />
          <stop offset="1" stopColor={face[2]} />
        </radialGradient>
        <radialGradient id={defId("accentRing")}>
          <stop offset="0.68" stopColor={mix(ACCENT, "#000000", 0.75)} />
          <stop offset="0.73" stopColor={mix(ACCENT, "#ffffff", 0.6)} />
          <stop offset="0.85" stopColor={ACCENT} />
          <stop offset="0.95" stopColor={mix(ACCENT, "#000000", 0.4)} />
          <stop offset="1" stopColor={mix(ACCENT, "#000000", 0.78)} />
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
        <path id={defId("arcLSC")} d={ARC_LSC} fill="none" />
      </defs>
      <DialFocusStyle />

      {/* Crown and the gap around the knob */}
      <circle cx={CX} cy={CY} r={178} fill={defUrl("crown")} />
      <circle cx={CX} cy={CY} r={158} fill="#07080a" />

      <g filter={defUrl("drop")}>
        <g {...ringProps(RING)}>
          <circle cx={CX} cy={CY} r={KNOB_RADIUS} fill={defUrl("face")} />
          <RadialLine r1={84} r2={137} deg={0} stroke="#fff" strokeWidth={4} strokeLinecap="round" />
          <PolarText r={123} deg={232} size={20}>
            +
          </PolarText>
          <ArcArrow geom={arcArrowGeom(123, 247, 240)} opacity={0.9} />
          <PolarText r={123} deg={128} size={20}>
            −
          </PolarText>
          <ArcArrow geom={arcArrowGeom(123, 113, 120)} opacity={0.9} />
          <ArcText href={`#${defId("arcLSC")}`} size={16} spacing={2}>
            LSC
          </ArcText>
          {brand === "fox" && <FoxLogo transform={FOX_LOGO_TR} />}
          {brand === "rockshox" && <RockShoxLogo transform={RS_LOGO_TR} />}
          <circle cx={CX} cy={CY} r={62} fill={defUrl("accentRing")} />
          <circle cx={CX} cy={CY} r={43} fill={defUrl("hub")} />
          <polygon points={hexPoints(14)} fill="#05060a" stroke="#2b2d33" strokeWidth={1} />
          <circle
            className={FOCUS_CLASS}
            cx={CX}
            cy={CY}
            r={150}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            pointerEvents="none"
          />
        </g>
      </g>

      {/* Static light and edges; the light does not turn with the knob */}
      <g pointerEvents="none">
        {/* The Fox blue runs to the rim without the dark well over it. */}
        {brand !== "fox" && <circle cx={CX} cy={CY} r={KNOB_RADIUS} fill={defUrl("well")} />}
        <circle cx={CX} cy={CY} r={43} fill={defUrl("well")} />
        <circle cx={CX} cy={CY} r={152} fill={defUrl("sheen")} />
        <circle cx={CX} cy={CY} r={150.5} fill="none" stroke={defUrl("bevel")} strokeWidth={3} opacity={0.8} />
        <circle cx={CX} cy={CY} r={62} fill="none" stroke={defUrl("bevel")} strokeWidth={1.5} opacity={0.7} />
        <polygon points={`${CX},${CY - 153} ${CX - 4.5},${CY - 163} ${CX + 4.5},${CY - 163}`} fill="#fff" />
      </g>
    </svg>
  );
}
