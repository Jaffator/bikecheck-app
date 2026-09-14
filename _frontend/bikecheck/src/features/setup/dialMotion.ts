// The physics every dial ring shares: the spring that settles onto a click, the magnetic
// detent and rubber stop while dragging, and the keyboard steps. Angles are in radians.

// Lightly underdamped spring: a short settle into the click without visible overshoot.
const SPRING_K = 420;
const SPRING_C = 26;
// Magnetic detent while dragging: 0 snaps hard, 1 ignores the clicks.
const DETENT = 0.45;
// Rubber stop at either end: how far the drawing may go past a stop and how stiff it gets.
const STOP_OVERSHOOT = 0.2;
const STOP_STIFFNESS = 0.35;
const STOP_MIN_GAIN = 0.08;
const KEY_STEPS: Record<string, number> = {
  ArrowUp: 1,
  ArrowRight: 1,
  ArrowDown: -1,
  ArrowLeft: -1,
  PageUp: 4,
  PageDown: -4,
};

// Per-ring motion, kept outside React: `u` is the drawn angle, `free` the unsnapped drag angle.
export interface RingMotion {
  value: number;
  u: number;
  vel: number;
  free: number;
  dragging: boolean;
  raf: number;
  last: number;
}

export function initialMotion(value: number, step: number): RingMotion {
  return { value, u: value * step, vel: 0, free: 0, dragging: false, raf: 0, last: 0 };
}

// A ring's clicks stay between fully closed and its `max`.
export function clampClicks(v: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(v)));
}

// One spring frame towards `target`; true once the ring has settled there.
export function tickSpring(m: RingMotion, target: number, now: number): boolean {
  const dt = Math.min(0.032, (now - (m.last || now)) / 1000) || 0.016;
  m.last = now;
  const d = target - m.u;
  m.vel += (d * SPRING_K - m.vel * SPRING_C) * dt;
  m.u += m.vel * dt;
  if (Math.abs(d) >= 0.0008 || Math.abs(m.vel) >= 0.01) return false;
  m.u = target;
  m.vel = 0;
  m.last = 0;
  return true;
}

// Advances a drag by `du` radians: rubber stops below fully closed and past `maxU` (the last
// click's angle), magnetic detent between them.
export function applyTurn(m: RingMotion, du: number, step: number, maxU: number): void {
  const over = m.free < 0 ? -m.free : m.free > maxU ? m.free - maxU : 0;
  const gain = over > 0 ? Math.max(STOP_MIN_GAIN, STOP_STIFFNESS - over) : 1;
  m.free += du * gain;
  const nearest = Math.round(m.free / step) * step;
  const clamped = Math.max(-STOP_OVERSHOOT, Math.min(maxU + STOP_OVERSHOOT, m.free));
  m.u = clamped <= 0 || clamped >= maxU ? clamped : nearest + (clamped - nearest) * DETENT;
}

// Clicks a key moves the ring by; undefined for a key the dial ignores. Home and End reach the
// two stops.
export function keyDelta(key: string, value: number, max: number): number | undefined {
  if (key === "Home") return -value;
  if (key === "End") return Math.max(0, max - value);
  return KEY_STEPS[key];
}
