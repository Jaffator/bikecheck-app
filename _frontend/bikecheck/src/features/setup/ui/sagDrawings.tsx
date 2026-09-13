// The two pictures sag is read off: a fork leg and a rear shock, each seen from the side with
// its rubber o-ring on the polished shaft. The ring starts at the seal and is pushed along the
// shaft by the sag, as it is on the bike - up the fork's stanchion, down the shock's shaft -
// and the shaft it has travelled is hatched as the sag range. Decoration around a figure: the
// gauge that draws one says the number, so the picture is hidden from assistive tech.
import type { ReactElement } from "react";
import { figureLine } from "./gaugeMetrics";
import { CAN_WIDTH, LOWER_WIDTH, PICTURE_WIDTH } from "./sagPictureMetrics";
// Sag is a share of the full travel, which is the whole exposed shaft.
const FULL_TRAVEL = 100;
// The o-ring: a thin band gripping the shaft, a touch wider than it.
const RING_HEIGHT = 2;
const RING_OVERHANG = 2;
// The hatched range hugs the shaft, a little wider than it either side.
const RANGE_OVERHANG = 6;
const GOLD_ID = "sag-gold";
const COPPER_ID = "sag-copper";
const ALLOY_ID = "sag-alloy";
const HATCH_ID = "sag-hatch";

// The pictures are drawn taller than the gauge and their foot cut off, so the shaft stays long
// while the picture stands a little shorter than the arc gauges beside it, leaving air over
// the minus and the plus.
const CROPPED_FOOT = 30;
const PICTURE_TRIM = 16;

interface SagPictureProps {
  size: number;
  // 0-100, already clamped by the gauge.
  sag: number;
}

// Gradients and the hatch, shared by every picture on the sheet; the ids are fixed.
function SagDefs(): ReactElement {
  return (
    <>
      <linearGradient id={GOLD_ID} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#8a6a1f" />
        <stop offset="0.3" stopColor="#e8c96a" />
        <stop offset="0.5" stopColor="#fff1b8" />
        <stop offset="0.75" stopColor="#d4b25a" />
        <stop offset="1" stopColor="#7a5c18" />
      </linearGradient>
      <linearGradient id={COPPER_ID} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#7a4218" />
        <stop offset="0.3" stopColor="#d98a4c" />
        <stop offset="0.5" stopColor="#f5bf8e" />
        <stop offset="0.75" stopColor="#c8733a" />
        <stop offset="1" stopColor="#6b3812" />
      </linearGradient>
      <linearGradient id={ALLOY_ID} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#1c1d20" />
        <stop offset="0.35" stopColor="#4a4d52" />
        <stop offset="0.6" stopColor="#2b2d31" />
        <stop offset="1" stopColor="#141517" />
      </linearGradient>
      <pattern id={HATCH_ID} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1={0} y1={0} x2={0} y2={6} stroke="var(--mantine-color-primary-6)" strokeWidth={2} />
      </pattern>
    </>
  );
}

interface SagRangeProps {
  // The seal the ring starts from, and the full travel along the shaft from it.
  sealY: number;
  travel: number;
  // How far the sag has pushed the ring: negative up the fork, positive down the shock.
  shift: number;
  shaftX: number;
  shaftWidth: number;
  clipId: string;
}

// The hatched range from the seal to the ring, moving with the ring and cut off at the seal so
// it never runs into the body the shaft disappears into.
function SagRange({ sealY, travel, shift, shaftX, shaftWidth, clipId }: SagRangeProps): ReactElement {
  // The band is laid on the far side of the seal and slides out from under it.
  const bandY = shift < 0 ? sealY : sealY - travel;
  const ringY = shift < 0 ? sealY - RING_HEIGHT : sealY;
  return (
    <g clipPath={`url(#${clipId})`}>
      <g style={{ transform: `translateY(${shift}px)`, transition: "transform 160ms ease-out" }}>
        <rect
          x={shaftX - RANGE_OVERHANG}
          y={bandY}
          width={shaftWidth + RANGE_OVERHANG * 2}
          height={travel}
          fill="var(--mantine-color-primary-6)"
          opacity={0.22}
        />
        <rect
          x={shaftX - RANGE_OVERHANG}
          y={bandY}
          width={shaftWidth + RANGE_OVERHANG * 2}
          height={travel}
          fill={`url(#${HATCH_ID})`}
          opacity={0.55}
        />
        <rect
          x={shaftX - RING_OVERHANG}
          y={ringY}
          width={shaftWidth + RING_OVERHANG * 2}
          height={RING_HEIGHT}
          rx={1}
          fill="#0b0b0c"
        />
      </g>
    </g>
  );
}

const FORK_CAP_HEIGHT = 6;
const FORK_CROWN_HEIGHT = 12;
const STANCHION_WIDTH = 16;
const WIPER_HEIGHT = 6;

// A fork leg: cap and crown on top, the gold stanchion, the lower with its brake arch and dust
// wiper. The ring is pushed up the stanchion from the wiper. The picture hangs from the top of
// the gauge's body, and the wiper sits as far under the figure line as the crown sits over it,
// so the figure beside the leg reads off the middle of the gold.
export function ForkLeg({ size, sag }: SagPictureProps): ReactElement {
  const legHeight = size + CROPPED_FOOT;
  const stanchionTop = FORK_CAP_HEIGHT + FORK_CROWN_HEIGHT;
  const sealY = 2 * figureLine(size) - stanchionTop;
  const travel = sealY - stanchionTop - RING_HEIGHT;
  const rise = (travel * sag) / FULL_TRAVEL;
  const stanchionX = (PICTURE_WIDTH - STANCHION_WIDTH) / 2;
  const lowerX = (PICTURE_WIDTH - LOWER_WIDTH) / 2;
  const clipId = `${HATCH_ID}-fork-${size}`;

  return (
    <svg
      width={PICTURE_WIDTH}
      height={size - PICTURE_TRIM}
      viewBox={`0 0 ${PICTURE_WIDTH} ${size - PICTURE_TRIM}`}
      aria-hidden="true"
    >
      <defs>
        <SagDefs />
        <clipPath id={clipId}>
          <rect x={0} y={0} width={PICTURE_WIDTH} height={sealY} />
        </clipPath>
      </defs>
      <rect x={stanchionX + 1} y={0} width={STANCHION_WIDTH - 2} height={FORK_CAP_HEIGHT + 2} rx={2} fill="#1e2233" />
      <rect
        x={stanchionX - 6}
        y={FORK_CAP_HEIGHT}
        width={STANCHION_WIDTH + 12}
        height={FORK_CROWN_HEIGHT}
        rx={3}
        fill={`url(#${ALLOY_ID})`}
      />
      <rect
        x={stanchionX}
        y={stanchionTop}
        width={STANCHION_WIDTH}
        height={sealY - stanchionTop + 4}
        fill={`url(#${GOLD_ID})`}
      />
      <SagRange
        sealY={sealY}
        travel={travel}
        shift={-rise}
        shaftX={stanchionX}
        shaftWidth={STANCHION_WIDTH}
        clipId={clipId}
      />
      <path d={`M ${lowerX} ${sealY + 14} q -12 -4 -10 -26 h 5 q -1 16 8 20 z`} fill={`url(#${ALLOY_ID})`} />
      <rect x={lowerX} y={sealY} width={LOWER_WIDTH} height={legHeight - sealY} rx={7} fill={`url(#${ALLOY_ID})`} />
      <rect x={lowerX} y={sealY} width={LOWER_WIDTH} height={WIPER_HEIGHT} rx={2} fill="#0f1012" />
    </svg>
  );
}

const EYELET_RADIUS = 7;
const SHAFT_WIDTH = 22;
const SLEEVE_HEIGHT = 6;
// The air can covers this much of the shock; the shaft below it is the travel.
const CAN_SHARE = 0.48;
// The copper sleeve is the lower part of the can.
const CAN_SLEEVE_SHARE = 0.35;

// A rear shock stood on end: an eyelet on top, the air can, its copper sleeve and seal, the
// gold shaft below and the lower eyelet at the foot. The ring is pushed down the shaft from
// the seal.
export function ShockBody({ size, sag }: SagPictureProps): ReactElement {
  const bodyHeight = size + CROPPED_FOOT;
  const canTop = EYELET_RADIUS * 2 - 2;
  const sealY = bodyHeight * CAN_SHARE;
  const canHeight = sealY - canTop;
  const sleeveTop = sealY - canHeight * CAN_SLEEVE_SHARE;
  const footTop = bodyHeight - EYELET_RADIUS * 2 - 6;
  const travel = footTop - sealY - RING_HEIGHT;
  const drop = (travel * sag) / FULL_TRAVEL;
  const cx = PICTURE_WIDTH / 2;
  const canX = cx - CAN_WIDTH / 2;
  const shaftX = cx - SHAFT_WIDTH / 2;
  const clipId = `${HATCH_ID}-shock-${size}`;

  return (
    <svg
      width={PICTURE_WIDTH}
      height={size - PICTURE_TRIM}
      viewBox={`0 0 ${PICTURE_WIDTH} ${size - PICTURE_TRIM}`}
      aria-hidden="true"
    >
      <defs>
        <SagDefs />
        <clipPath id={clipId}>
          <rect x={0} y={sealY} width={PICTURE_WIDTH} height={bodyHeight - sealY} />
        </clipPath>
      </defs>
      {/* Top eyelet */}
      <circle cx={cx} cy={EYELET_RADIUS} r={EYELET_RADIUS} fill={`url(#${ALLOY_ID})`} />
      <circle cx={cx} cy={EYELET_RADIUS} r={2.5} fill="var(--mantine-color-cards-6)" />
      {/* The shaft runs the whole way; the can hides its top */}
      <rect x={shaftX} y={sealY - 4} width={SHAFT_WIDTH} height={footTop - sealY + 6} fill={`url(#${GOLD_ID})`} />
      <SagRange sealY={sealY} travel={travel} shift={drop} shaftX={shaftX} shaftWidth={SHAFT_WIDTH} clipId={clipId} />
      {/* Air can: dark body, copper sleeve, seal */}
      <rect x={canX} y={canTop} width={CAN_WIDTH} height={canHeight} rx={5} fill={`url(#${ALLOY_ID})`} />
      <rect x={canX} y={sleeveTop} width={CAN_WIDTH} height={sealY - sleeveTop} fill={`url(#${COPPER_ID})`} />
      <rect x={canX + 2} y={sealY - SLEEVE_HEIGHT} width={CAN_WIDTH - 4} height={SLEEVE_HEIGHT} rx={2} fill="#0f1012" />
      {/* Lower eyelet */}
      <rect x={cx - 12} y={footTop} width={24} height={10} rx={3} fill={`url(#${ALLOY_ID})`} />
      <circle cx={cx} cy={footTop + 8 + EYELET_RADIUS} r={EYELET_RADIUS} fill={`url(#${ALLOY_ID})`} />
      <circle cx={cx} cy={footTop + 8 + EYELET_RADIUS} r={2.5} fill="var(--mantine-color-cards-6)" />
    </svg>
  );
}
