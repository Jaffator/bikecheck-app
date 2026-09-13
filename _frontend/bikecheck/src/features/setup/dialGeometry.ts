// Polar geometry for the front-view dials: every ring is drawn around one centre of a
// 320x320 viewBox, angles in degrees with 0 at twelve o'clock, clockwise.

export const TAU = Math.PI * 2;
export const DEG = 180 / Math.PI;
export const CX = 160;
export const CY = 160;

export type Point = [number, number];

// An arc-shaped arrow: the curved shaft and the open ">" head as polyline points.
export interface ArrowGeom {
  shaft: string;
  head: string;
}

export function polar(r: number, deg: number): Point {
  const a = (deg - 90) / DEG;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

export function fmt(n: number): string {
  return n.toFixed(2);
}

export function arcPath(r: number, d1: number, d2: number, cw = true): string {
  const [x1, y1] = polar(r, d1);
  const [x2, y2] = polar(r, d2);
  const large = Math.abs(d2 - d1) > 180 ? 1 : 0;
  return `M${fmt(x1)} ${fmt(y1)}A${r} ${r} 0 ${large} ${cw ? 1 : 0} ${fmt(x2)} ${fmt(y2)}`;
}

// A circle with `n` lobes cut `depth` deep; `pow` sharpens the lobes.
export function wavyCircle(R: number, depth: number, n: number, pow = 1): string {
  const K = 720;
  let d = "";
  for (let i = 0; i < K; i++) {
    const deg = (i * 360) / K;
    const w = Math.pow(0.5 + 0.5 * Math.cos((n * deg) / DEG), pow);
    const [x, y] = polar(R - depth * w, deg);
    d += (i ? "L" : "M") + fmt(x) + " " + fmt(y);
  }
  return d + "Z";
}

export function hexPoints(r: number): string {
  return [0, 1, 2, 3, 4, 5].map((i) => polar(r, 30 + 60 * i).map(fmt).join(",")).join(" ");
}

// Arrow along the circle of radius `r`, head at `degTo`; `arm` is the head's half-width and
// `reach` how far back along the arc it opens.
export function arcArrowGeom(r: number, degFrom: number, degTo: number, arm = 3, reach = 1): ArrowGeom {
  const dir = Math.sign(degTo - degFrom);
  const back = degTo - dir * (arm / r) * DEG * reach;
  const tip = polar(r, degTo);
  const a = polar(r + arm, back);
  const b = polar(r - arm, back);
  return {
    shaft: arcPath(r, degFrom, degTo, dir > 0),
    head: `${fmt(a[0])},${fmt(a[1])} ${fmt(tip[0])},${fmt(tip[1])} ${fmt(b[0])},${fmt(b[1])}`,
  };
}
