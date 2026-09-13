// The one drag engine behind every dial: which ring a pointer is on, how far it turned, the
// spring that settles onto the next click, wheel and keyboard. A dial hands each ring its
// hit-test, its turn and, if it is not a plain rotation, its drawing. Angles are written
// straight to the DOM; React only learns the click count through onChange.
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type Ref,
  type RefObject,
} from "react";
import { useReducedMotion } from "@mantine/hooks";
import { tapFeedback } from "@/utils/haptics";
import type { Direction, RingValue } from "./dial.types";
import { CX, CY, DEG, TAU } from "./dialGeometry";
import { applyTurn, clampClicks, initialMotion, keyDelta, tickSpring, type RingMotion } from "./dialMotion";

// A pointer position in viewBox units.
export interface LocalPoint {
  x: number;
  y: number;
}

// How a ring answers the pointer: whether a point is on it, and the radians a move turns it.
export interface RingPointer {
  hit: (pt: LocalPoint) => boolean;
  turn: (from: LocalPoint, to: LocalPoint) => number;
}

// One ring as the engine sees it.
export interface RingSpec extends RingValue, RingPointer {
  key: string;
  clicksPerTurn: number;
  // Draws the ring at `angle` radians; by default its <g> is rotated about the centre.
  draw?: (angle: number, g: SVGGElement) => void;
  // A ring lettered the other way round from the dial it sits on turns against it.
  direction?: Direction;
  onActive?: () => void;
}

interface Drag {
  key: string | null;
  pid: number | null;
  last: LocalPoint;
}

// What a dial spreads onto the <g> of one ring.
export interface RingGroupProps {
  ref: Ref<SVGGElement>;
  tabIndex: number;
  role: "slider";
  className: string;
  style: CSSProperties;
  "aria-label": string;
  "aria-valuemin": number;
  "aria-valuemax": number;
  "aria-valuenow": number;
  "aria-valuetext"?: string;
  "aria-readonly": boolean;
  onKeyDown: (e: KeyboardEvent<SVGGElement>) => void;
  onFocus: () => void;
}

// What a dial spreads onto its root <svg>.
export interface DialSvgProps {
  ref: RefObject<SVGSVGElement | null>;
  onPointerDown: (e: PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (e: PointerEvent<SVGSVGElement>) => void;
  onPointerUp: (e: PointerEvent<SVGSVGElement>) => void;
  onPointerCancel: (e: PointerEvent<SVGSVGElement>) => void;
}

export interface DialEngine {
  svgProps: DialSvgProps;
  ringProps: (key: string) => RingGroupProps;
  // Ids for the dial's own <defs>, unique per instance so two dials on one screen keep apart.
  defId: (name: string) => string;
  defUrl: (name: string) => string;
}

// Class names the focus outline is styled by; see DialFocusStyle.
export const RING_CLASS = "dial-ring";
export const FOCUS_CLASS = "dial-focus";

// The root <svg> of every dial: fills its box, no text selection, the pointer owns touches.
export const DIAL_SVG_STYLE: CSSProperties = {
  display: "block",
  width: "100%",
  height: "auto",
  overflow: "visible",
  userSelect: "none",
  touchAction: "none",
  cursor: "grab",
};

const NO_DRAG: Drag = { key: null, pid: null, last: { x: 0, y: 0 } };

// A ring seen from the front: hit by distance from the centre, turned by the angle swept round it.
export function radialRing(rMin: number, rMax: number): RingPointer {
  const phi = (pt: LocalPoint): number => Math.atan2(pt.y - CY, pt.x - CX);
  return {
    hit: (pt) => {
      const r = Math.hypot(pt.x - CX, pt.y - CY);
      return r >= rMin && r < rMax;
    },
    turn: (from, to) => {
      let d = phi(to) - phi(from);
      if (d > Math.PI) d -= TAU;
      else if (d < -Math.PI) d += TAU;
      return d;
    },
  };
}

// A ring seen from the side: hit within its band on the cylinder, turned by the sideways travel
// over its radius.
export function sideRing(cx: number, top: number, height: number, radius: number): RingPointer {
  return {
    hit: (pt) => Math.abs(pt.x - cx) <= radius && pt.y >= top && pt.y < top + height,
    turn: (from, to) => (to.x - from.x) / radius,
  };
}

function rotateAbout(g: SVGGElement, angle: number): void {
  g.setAttribute("transform", `rotate(${(angle * DEG).toFixed(3)} ${CX} ${CY})`);
}

// Read-only draws and announces every ring, but no pointer, wheel or key turns one.
export function useDialEngine(
  specs: RingSpec[],
  direction: Direction,
  haptics: boolean,
  readOnly = false,
): DialEngine {
  const svgRef = useRef<SVGSVGElement>(null);
  const groups = useRef<Record<string, SVGGElement | null>>({});
  const motions = useRef<Record<string, RingMotion>>({});
  const drag = useRef<Drag>(NO_DRAG);
  const reducedMotion = useReducedMotion();
  const uid = useId().replace(/[^A-Za-z0-9_-]/g, "");

  // Listeners bound once read the latest props through refs; refs are written only in effects.
  const specsRef = useRef(specs);
  const signRef = useRef(1);
  const hapticsRef = useRef(haptics);
  const readOnlyRef = useRef(readOnly);
  const reducedRef = useRef(reducedMotion);
  useLayoutEffect(() => {
    specsRef.current = specs;
    // SVG rotate(+) is clockwise.
    signRef.current = direction === "cw" ? 1 : -1;
    hapticsRef.current = haptics;
    readOnlyRef.current = readOnly;
    reducedRef.current = reducedMotion;
  });

  // The ring's own direction wins over the dial's.
  const sign = (key: string): number => {
    const own = spec(key).direction;
    return own === undefined ? signRef.current : own === "cw" ? 1 : -1;
  };

  const spec = (key: string): RingSpec => {
    const found = specsRef.current.find((s) => s.key === key);
    if (!found) throw new Error(`Unknown dial ring "${key}"`);
    return found;
  };
  const step = (key: string): number => TAU / spec(key).clicksPerTurn;
  const motion = (key: string): RingMotion => {
    let m = motions.current[key];
    if (!m) {
      m = initialMotion(spec(key).value, step(key));
      motions.current[key] = m;
    }
    return m;
  };

  const render = (key: string): void => {
    const g = groups.current[key];
    if (!g) return;
    const angle = sign(key) * motion(key).u;
    const draw = spec(key).draw;
    if (draw) draw(angle, g);
    else rotateAbout(g, angle);
  };

  const animate = (key: string): void => {
    const m = motion(key);
    if (m.raf) return;
    const tick = (now: number): void => {
      const settled = tickSpring(m, m.value * step(key), now);
      render(key);
      m.raf = settled ? 0 : requestAnimationFrame(tick);
    };
    m.raf = requestAnimationFrame(tick);
  };

  const goTo = (key: string): void => {
    if (!reducedRef.current) {
      animate(key);
      return;
    }
    const m = motion(key);
    m.u = m.value * step(key);
    m.vel = 0;
    render(key);
  };

  const setValue = (key: string, raw: number): void => {
    const m = motion(key);
    const v = clampClicks(raw, spec(key).max);
    if (v === m.value) return;
    m.value = v;
    if (hapticsRef.current) tapFeedback();
    spec(key).onChange(v);
  };

  const nudge = (key: string, d: number): void => {
    spec(key).onActive?.();
    setValue(key, motion(key).value + d);
    goTo(key);
  };

  // Client coordinates to viewBox coordinates.
  const local = (e: { clientX: number; clientY: number }): LocalPoint => {
    const svg = svgRef.current!;
    const b = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    return {
      x: vb.x + ((e.clientX - b.left) / b.width) * vb.width,
      y: vb.y + ((e.clientY - b.top) / b.height) * vb.height,
    };
  };
  const ringAt = (pt: LocalPoint): string | null => specsRef.current.find((s) => s.hit(pt))?.key ?? null;

  const endDrag = (pointerId: number): void => {
    const d = drag.current;
    if (!d.key || pointerId !== d.pid) return;
    const key = d.key;
    const m = motion(key);
    m.dragging = false;
    drag.current = NO_DRAG;
    setValue(key, m.free / step(key));
    goTo(key);
  };

  // A value set from outside (± buttons, a loaded profile) turns the ring to it.
  useEffect(() => {
    for (const sp of specs) {
      const m = motion(sp.key);
      if (!m.dragging && m.value !== sp.value) {
        m.value = sp.value;
        goTo(sp.key);
      }
    }
  });
  useLayoutEffect(() => {
    for (const sp of specs) render(sp.key);
  });
  useEffect(
    () => () => {
      for (const m of Object.values(motions.current)) if (m.raf) cancelAnimationFrame(m.raf);
    },
    [],
  );
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    // Wheel must be non-passive to preventDefault the page scroll.
    const onWheel = (e: WheelEvent): void => {
      if (readOnlyRef.current) return;
      const key = ringAt(local(e));
      if (!key) return;
      e.preventDefault();
      nudge(key, Math.sign(e.deltaY || e.deltaX));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    // Safety net for a pointer released outside when capture did not take.
    const end = (e: globalThis.PointerEvent): void => endDrag(e.pointerId);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      svg.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
    // Handlers read live state through refs, so binding once is correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (e: PointerEvent<SVGSVGElement>): void => {
    if (readOnlyRef.current) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const pt = local(e);
    const key = ringAt(pt);
    if (!key) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic events have no pointer to capture.
    }
    drag.current = { key, pid: e.pointerId, last: pt };
    const m = motion(key);
    spec(key).onActive?.();
    if (m.raf) {
      cancelAnimationFrame(m.raf);
      m.raf = 0;
      m.last = 0;
    }
    m.dragging = true;
    m.free = m.u;
    m.vel = 0;
    groups.current[key]?.focus({ preventScroll: true });
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>): void => {
    const d = drag.current;
    if (!d.key || e.pointerId !== d.pid) return;
    const pt = local(e);
    const key = d.key;
    const m = motion(key);
    const st = step(key);
    applyTurn(m, sign(key) * spec(key).turn(d.last, pt), st, spec(key).max * st);
    d.last = pt;
    setValue(key, m.free / st);
    render(key);
  };

  const onPointerUp = (e: PointerEvent<SVGSVGElement>): void => endDrag(e.pointerId);

  const ringProps = (key: string): RingGroupProps => {
    const sp = specs.find((s) => s.key === key);
    if (!sp) throw new Error(`Unknown dial ring "${key}"`);
    return {
      ref: (el: SVGGElement | null) => {
        groups.current[key] = el;
      },
      tabIndex: 0,
      role: "slider",
      className: RING_CLASS,
      style: { outline: "none" },
      "aria-label": sp.ariaLabel,
      "aria-valuemin": 0,
      "aria-valuemax": sp.max,
      "aria-valuenow": sp.value,
      "aria-valuetext": sp.ariaValueText,
      "aria-readonly": readOnly,
      onKeyDown: (e: KeyboardEvent<SVGGElement>) => {
        if (readOnly) return;
        const d = keyDelta(e.key, motion(key).value, sp.max);
        if (d === undefined) return;
        e.preventDefault();
        nudge(key, d);
      },
      onFocus: () => sp.onActive?.(),
    };
  };

  const defId = (name: string): string => `${uid}-${name}`;
  return {
    svgProps: { ref: svgRef, onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
    ringProps,
    defId,
    defUrl: (name) => `url(#${defId(name)})`,
  };
}
