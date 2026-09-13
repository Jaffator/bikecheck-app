// The compression knob of a RockShox Charger damper seen from the front: the outer black ring
// lettered CHARGER is HSC, the inner knob with the blue collar is LSC. Drag round the ring,
// wheel over it, or use the arrows, PageUp/PageDown, Home and End; plus and minus buttons
// belong to the screen.
import type { ReactElement } from "react";
import type { CompressionDialProps } from "../dial.types";
import { DIAL_SVG_STYLE, FOCUS_CLASS, radialRing, useDialEngine } from "../dialEngine";
import { arcArrowGeom, arcPath, CX, CY, hexPoints, wavyCircle } from "../dialGeometry";
import { ArcArrow, ArcText, DialFocusStyle, PolarText, RadialLine } from "./dialParts";

// Clicks per turn: HSC 30 degrees a click, LSC 18; the LSC face carries one tick per click.
const HSC_CLICKS_PER_TURN = 12;
const LSC_TICKS = 20;
// Where the HSC ring ends and the LSC knob begins.
const LSC_RADIUS = 104;

const HSC_EDGE = wavyCircle(152, 3.5, 72, 1.3);
const ARC_CHARGER = arcPath(127, -92, -36, true);
const ARC_HSC = arcPath(127, 32, 80, true);
const ARC_LSC = arcPath(90, 200, 160, false);
const LSC_TICK_INDEXES = Array.from({ length: LSC_TICKS }, (_, i) => i).filter((i) => i > 0);

// The RockShox wordmark, inlined as path data and placed on the lower half of the HSC ring.
const RS_LOGO_D = "M289.8,322c0,0,6-6.6,11.4-12.3c6.9-7.5,9.4-13.2,9.4-25c0-11.7,0-34.7,0-34.7h-21.6c0,0,0,22.7,0,30.4 c0,11.6-2.9,12.4-7.6,17.8c-3.6,4-6.3,6.7-6.3,6.7c-0.8,0.9-1.5,1.7-2.2,2.5V250h-21.6V394h21.6v-57.6l2.2,2.5l6.3,6.9 c4.7,5.4,7.6,6.2,7.6,17.8V394h21.6c0,0,0-22.9,0-34.7c0-11.7-2.5-17.5-9.4-25L289.8,322z M356.2,305c-4.2-4.5-6.2-5.8-6.2-13.8 v-12.9c0-4.1,3-7.4,6.9-7.4h2.2c3.8,0,7,3.3,7,7.4v25h21.6v-24.9c0-16.9-12.8-30.6-28.5-30.6H357v-0.1c-15.8,0-28.5,13.7-28.5,30.6 c0,0,0,3.8,0,15.3c0,11.4,2.4,16.7,7.6,22.4l23.9,23.3c4.2,4.5,6.2,5.8,6.2,13.8c0,6.3,0,12.8,0,12.8c0,4.1-3.1,7.4-7,7.5H357 c-3.8-0.1-7-3.4-7-7.5l0-24.9h-21.6v24.9c0,16.9,12.8,30.5,28.5,30.5h2.2v0h0c15.8,0,28.5-13.7,28.5-30.6c0,0,0-3.8,0-15.2 c0-11.4-2.4-16.7-7.5-22.4L356.2,305z M211.9,348.7v17.2c0,4.1-3.1,7.4-7,7.4h-2.2c-3.8,0-7-3.3-7-7.4v-87.6c0-4,3.1-7.4,7-7.4h2.2 c3.8,0,7,3.4,7,7.4v25h21.6l0-24.9c0-16.9-12.8-30.6-28.5-30.6h0h-2.2c-15.8,0-28.5,13.7-28.5,30.6l0,87.5 c0,16.9,12.8,30.6,28.6,30.6v0h2.2v0c15.8,0,28.6-13.7,28.6-30.6v-17.2L211.9,348.7L211.9,348.7z M520.3,365.9c0,4.1-3.1,7.4-7,7.4 h-2.2c-3.8,0-7-3.3-7-7.4v-87.6c0-4,3.1-7.4,7-7.4h2.2c3.8,0,7,3.4,7,7.4V365.9z M513.4,247.8L513.4,247.8h-2.3 c-15.8,0-28.5,13.7-28.5,30.6l0,87.5c0,16.9,12.8,30.6,28.6,30.6v0h2.2v0c15.7,0,28.5-13.7,28.6-30.6v-87.5 C541.9,261.4,529.1,247.8,513.4,247.8L513.4,247.8z M134.8,365.9c0,4.1-3.1,7.4-7,7.4h-2.2c-3.8,0-7-3.3-7-7.4v-87.6 c0-4,3.1-7.4,7-7.4h2.2c3.8,0,7,3.4,7,7.4V365.9z M127.9,247.8L127.9,247.8h-2.2c-15.7,0-28.5,13.7-28.5,30.6l0,87.5 c0,16.9,12.8,30.6,28.6,30.6v0h2.2v0c15.8,0,28.6-13.7,28.6-30.6l-0.1-87.5C156.5,261.4,143.7,247.8,127.9,247.8L127.9,247.8z M606.8,323.1l-0.6-0.5l0.6-0.5c0,0,3.7-3.2,6.7-6.9c5.4-6.7,6.6-9.4,6.6-22.2c0-18,0-42.8,0-42.8l-21.6,0v42.1 c0,5-3.1,8.9-4.2,10.5c-1.1,1.7-2.7,2.9-2.7,2.9l-1.6,1.5l-1.7-1.5c0,0-1.7-1.3-2.7-2.9c-1-1.7-4.2-5.5-4.2-10.5v-42.1l-21.6,0v42.8 c0,12.8,1.2,15.5,6.6,22.2c2.9,3.6,6.6,6.9,6.6,6.9l0.6,0.5l-0.6,0.5l-6.6,7c-5.4,6.7-6.6,9.3-6.6,22.2V395l21.6,0 c0,0,0-37.1,0-42.1s3.1-8.8,4.2-10.5l2.7-2.9l1.7-1.5l1.6,1.5l2.7,2.9c1.1,1.7,4.2,5.4,4.2,10.5s0,42.1,0,42.1l21.6,0v-42.8 c0-12.8-1.1-15.5-6.5-22.2L606.8,323.1z M443.2,310.5h-16.1v-60.4h-21.6V394h21.6v-60.3l16.1,0l0,60.4h21.6l0-143.8h-21.6V310.5z M57.7,303.7c0,4.1-3.1,7.4-6.9,7.4h-9.1v-38.5h9.1c3.8,0,6.9,3.3,6.9,7.4V303.7z M69.5,321.9c6-5.6,9.8-13.8,9.8-23.1v-18.3 c0-16.9-12.8-30.5-28.5-30.5H20l0.1,143.9l21.6,0v-60h9.1c3.9,0,7,3.3,6.9,7.4l0.1,52.6h21.6l0-48.9 C79.4,335.8,75.6,327.5,69.5,321.9L69.5,321.9z";
const RS_LOGO_TR = "translate(115.258 240.929) scale(0.1371)";

export function RockShoxCompressionDial({
  hsc,
  lsc,
  ariaLabel,
  direction = "cw",
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
        <radialGradient id={defId("blueRing")}>
          <stop offset="0.68" stopColor="#082653" />
          <stop offset="0.73" stopColor="#4a9bff" />
          <stop offset="0.85" stopColor="#2f7de0" />
          <stop offset="0.95" stopColor="#1a58b4" />
          <stop offset="1" stopColor="#0a2a62" />
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
        <path id={defId("arcCharger")} d={ARC_CHARGER} fill="none" />
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
          {[0, 105, 255].map((a) => (
            <RadialLine key={a} r1={108} r2={150} deg={a} stroke="#fff" strokeWidth={3} strokeLinecap="round" />
          ))}
          <ArcText href={`#${defId("arcCharger")}`} size={10.5} spacing={1.2}>
            CHARGER
          </ArcText>
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
          <g transform={RS_LOGO_TR}>
            <path d={RS_LOGO_D} fill="#f4f4f5" />
          </g>
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
          <circle cx={CX} cy={CY} r={44} fill={defUrl("blueRing")} />
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
