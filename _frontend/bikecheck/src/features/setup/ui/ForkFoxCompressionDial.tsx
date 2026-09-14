// The compression knob of a Fox GRIP X damper seen from the front: the blue lobed ring is HSC,
// the black knob with the cross is LSC. Drag round the ring, wheel over it, or use the arrows,
// PageUp/PageDown, Home and End; plus and minus buttons belong to the screen.
import type { ReactElement } from "react";
import type { CompressionDialProps } from "../dial.types";
import { DIAL_SVG_STYLE, FOCUS_CLASS, radialRing, useDialEngine } from "../dialEngine";
import { arcArrowGeom, arcPath, CX, CY, fmt, hexPoints, wavyCircle } from "../dialGeometry";
import { FoxLogo } from "./dialLogos";
import { ArcArrow, ArcText, DIAL_FONT, DialFocusStyle, INK, PolarText, RadialLine } from "./dialParts";

// Clicks per turn: HSC 22.5 degrees a click, LSC 15.
const HSC_CLICKS_PER_TURN = 16;
const LSC_CLICKS_PER_TURN = 24;
// Where the HSC ring ends and the LSC knob begins.
const LSC_RADIUS = 88;
const GREY = "#c9ccd1";

const HSC_EDGE = wavyCircle(152, 5, 12, 1);
const ARC_HSC = arcPath(132, -76, 76, true);
// The thick curved arrows beside the signs, as on the real knob.
const RING_ARROW_MINUS = arcArrowGeom(128, 262, 220, 8, 0.8);
const RING_ARROW_PLUS = arcArrowGeom(128, 98, 140, 8, 0.8);
// Fine radial brushing over the blue ring, alternating light and dark.
const BRUSH = Array.from({ length: 240 }, (_, i) => ({ deg: (i * 360) / 240 + (i % 2 ? 0.35 : 0), light: i % 2 === 0 }));

// The Fox wordmark placed on the lower half of the HSC ring.
const FOX_LOGO_TR = "translate(131.486 252.539) scale(0.2958)";

// A white pentagon arrow pointing down, under the LSC signs.
function downArrowPoints(x: number, y: number, hw = 5.5): string {
  return [
    [x - hw, y - 10],
    [x + hw, y - 10],
    [x + hw, y + 4],
    [x, y + 12],
    [x - hw, y + 4],
  ]
    .map((q) => q.map(fmt).join(","))
    .join(" ");
}

// The two diagonal bars of the LSC knob.
function Cross({ w, color }: { w: number; color: string }): ReactElement {
  return (
    <>
      {[45, 135].map((a) => (
        <RadialLine key={a} r1={58} r2={-58} deg={a} stroke={color} strokeWidth={w} strokeLinecap="round" />
      ))}
    </>
  );
}

export function FoxCompressionDial({
  hsc,
  lsc,
  ariaLabel,
  // Fox prints the plus clockwise, so clicks from fully closed run the other way: toward the
  // minus the count climbs, toward the plus it falls to the end stop (ADR 0029).
  direction = "ccw",
  haptics = true,
  onActive,
  readOnly = false,
  className,
  style,
}: CompressionDialProps): ReactElement {
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
        // The inner knob prints its minus clockwise, the other way round from the ring.
        direction: "cw",
        clicksPerTurn: lsc.clicksPerTurn ?? LSC_CLICKS_PER_TURN,
        onActive: () => onActive?.("lsc"),
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
          <stop offset="0" stopColor="#3a3c41" />
          <stop offset="0.55" stopColor="#1f2125" />
          <stop offset="1" stopColor="#0b0c0e" />
        </radialGradient>
        <radialGradient id={defId("blueRing")}>
          <stop offset="0.56" stopColor="#08215e" />
          <stop offset="0.60" stopColor="#3a78ea" />
          <stop offset="0.72" stopColor="#2560d6" />
          <stop offset="0.9" stopColor="#1f55c6" />
          <stop offset="0.975" stopColor="#3271e4" />
          <stop offset="1" stopColor="#0a2466" />
        </radialGradient>
        <radialGradient id={defId("lscFace")}>
          <stop offset="0" stopColor="#1c1d21" />
          <stop offset="0.8" stopColor="#101114" />
          <stop offset="1" stopColor="#040405" />
        </radialGradient>
        <radialGradient id={defId("hub")}>
          <stop offset="0" stopColor="#43454b" />
          <stop offset="0.75" stopColor="#1e1f23" />
          <stop offset="1" stopColor="#0c0d0f" />
        </radialGradient>
        <linearGradient id={defId("sheen")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={0.3} />
          <stop offset="0.42" stopColor="#fff" stopOpacity={0} />
          <stop offset="0.62" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.45} />
        </linearGradient>
        <linearGradient id={defId("bevel")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={0.7} />
          <stop offset="0.5" stopColor="#fff" stopOpacity={0.06} />
          <stop offset="1" stopColor="#000" stopOpacity={0.7} />
        </linearGradient>
        <radialGradient id={defId("well")}>
          <stop offset="0.86" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.65} />
        </radialGradient>
        <filter id={defId("drop")} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000" floodOpacity={0.6} />
        </filter>
        <path id={defId("arcHSC")} d={ARC_HSC} fill="none" />
      </defs>
      <DialFocusStyle />

      {/* Crown and the gap around the knob */}
      <circle cx={CX} cy={CY} r={178} fill={defUrl("crown")} />
      <circle cx={CX} cy={CY} r={158} fill="#07080a" />

      <g filter={defUrl("drop")}>
        {/* HSC: the blue lobed ring */}
        <g {...ringProps("hsc")}>
          <path d={HSC_EDGE} fill={defUrl("blueRing")} />
          <g>
            {BRUSH.map((b, i) => (
              <RadialLine
                key={i}
                r1={94}
                r2={146}
                deg={b.deg}
                stroke={b.light ? "#fff" : "#000"}
                strokeOpacity={b.light ? 0.07 : 0.1}
                strokeWidth={0.6}
              />
            ))}
          </g>
          <ArcText href={`#${defId("arcHSC")}`} size={10.5} spacing={1.4} weight={800}>
            HIGH SPEED COMPRESSION
          </ArcText>
          <ArcArrow geom={RING_ARROW_MINUS} color={GREY} width={6} />
          <PolarText r={128} deg={206} size={17} fontWeight={800} fill={GREY}>
            −
          </PolarText>
          <ArcArrow geom={RING_ARROW_PLUS} color={GREY} width={6} />
          <PolarText r={128} deg={154} size={17} fontWeight={800} fill={GREY}>
            +
          </PolarText>
          <FoxLogo transform={FOX_LOGO_TR} />
          <rect
            className={FOCUS_CLASS}
            x={CX - 157}
            y={CY - 157}
            width={314}
            height={314}
            rx={157}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            pointerEvents="none"
          />
        </g>

        {/* LSC: the black knob with the cross */}
        <g {...ringProps("lsc")}>
          <circle cx={CX} cy={CY} r={LSC_RADIUS} fill={defUrl("lscFace")} />
          <Cross w={38} color="#060607" />
          <Cross w={34} color="#1f2125" />
          <Cross w={20} color="#272a2f" />
          <PolarText r={60} deg={180} size={11.5} fontWeight={800} letterSpacing={1.5}>
            LSC
          </PolarText>
          <text
            x={CX - 62}
            y={CY - 24}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily={DIAL_FONT}
            fontWeight={800}
            fontSize={17}
            fill={INK}
          >
            +
          </text>
          <polygon points={downArrowPoints(CX - 62, CY)} fill={INK} />
          <text
            x={CX + 62}
            y={CY - 24}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily={DIAL_FONT}
            fontWeight={800}
            fontSize={17}
            fill={INK}
          >
            −
          </text>
          <polygon points={downArrowPoints(CX + 62, CY)} fill={INK} />
          <circle cx={CX} cy={CY} r={15} fill={defUrl("hub")} />
          <polygon points={hexPoints(7.5)} fill="#05060a" stroke="#2b2d33" strokeWidth={1} />
          <circle
            className={FOCUS_CLASS}
            cx={CX}
            cy={CY}
            r={84}
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
        <circle cx={CX} cy={CY} r={152} fill={defUrl("sheen")} />
        <circle cx={CX} cy={CY} r={149} fill="none" stroke={defUrl("bevel")} strokeWidth={3} opacity={0.75} />
        <circle cx={CX} cy={CY} r={89} fill="none" stroke={defUrl("bevel")} strokeWidth={2} opacity={0.6} />
        <polygon points={`${CX},${CY - 153} ${CX - 4.5},${CY - 163} ${CX + 4.5},${CY - 163}`} fill="#fff" />
      </g>
    </svg>
  );
}
