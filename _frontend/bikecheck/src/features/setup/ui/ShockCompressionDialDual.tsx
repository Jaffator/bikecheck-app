/**
 * RearShockCompressionDial (soubor CaneCreekCompressionDial.tsx) — univerzální ovladač komprese zadního tlumiče (LSC / HSC),
 * čelní pohled, HSC nahoře, LSC dole, průhledné pozadí. React + SVG, bez závislostí.
 * Knob jako na eloxovaných ovladačích zadních tlumičů: vyvýšený prstenec s vyleptaným názvem po obvodu
 * („HIGH SPEED COMPRESSION“ / „LOW SPEED COMPRESSION“) a zahnutými šipkami „FIRM +“ / „SOFT −“, zapuštěné čelo
 * s ocelovým imbusem, bílá ryska ukazatele natočení (bez stupnice).
 *
 *   <CaneCreekCompressionDial
 *     lsc={{ value: lsc, max: 20, onChange: setLsc }}
 *     hsc={{ value: hsc, max: 10, onChange: setHsc }}
 *   />
 *
 * Hodnota = kliky od plně zavřeno. Výchozí `direction="cw"` (jako Fox): po směru hodin kliky přibývají (SOFT, otevírání),
 * proti směru ubývají až na 0 (FIRM). `direction="ccw"` obrací a šipky se přehodí.
 * Ovládání: tažení po knobu, kolečko, šipky / PageUp / PageDown / Home / End, vlastní tlačítka ±.
 * Respektuje prefers-reduced-motion, vibruje při kliku (Android).
 */
import { useEffect, useId, useLayoutEffect, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";

const TAU = Math.PI * 2, DEG = 180 / Math.PI;
const R_KNOB = 104, R_TEXT = 90, R_FACE = 54, R_HIT = 126;
const R_MARK_IN = 60, R_MARK_OUT = 78;   // ryska ukazatele: mezi čelem a nápisem
const f = (n: number) => n.toFixed(2);
const P = (r: number, deg: number): [number, number] => { const a = (deg - 90) / DEG; return [r * Math.cos(a), r * Math.sin(a)]; };
const poly = (pts: number[][]) => pts.map((q) => q.map(f).join(",")).join(" ");
const arcPath = (r: number, d1: number, d2: number) => {
  const [x1, y1] = P(r, d1), [x2, y2] = P(r, d2);
  return `M${f(x1)} ${f(y1)}A${r} ${r} 0 ${Math.abs(d2 - d1) > 180 ? 1 : 0} ${d2 > d1 ? 1 : 0} ${f(x2)} ${f(y2)}`;
};
// Text po oblouku; cw=true se čte po směru hodin (hlavou ven nahoře), cw=false proti směru (hlavou ven dole)
const textArc = (r: number, mid: number, span: number, cw: boolean) => (cw ? arcPath(r, mid - span / 2, mid + span / 2) : arcPath(r, mid + span / 2, mid - span / 2));
// Zahnutá šipka po obvodu: oblouk + hrot na konci degTo
const arcArrowGeom = (r: number, degFrom: number, degTo: number, arm = 4) => {
  const dir = Math.sign(degTo - degFrom);
  const back = degTo - dir * (arm / r) * DEG * 0.8;
  const tip = P(r, degTo), a = P(r + arm, back), b = P(r - arm, back);
  return { shaft: arcPath(r, degFrom, degTo), head: `${f(a[0])},${f(a[1])} ${f(tip[0])},${f(tip[1])} ${f(b[0])},${f(b[1])}` };
};
const HEX = poly([0, 1, 2, 3, 4, 5].map((i) => P(13, 30 + 60 * i)));

export type Direction = "cw" | "ccw";
export type KnobValue = {
  value: number;
  max: number;
  onChange: (value: number) => void;
  /** Kliků na otáčku (výchozí HSC 12 = 30° na klik, LSC 24 = 15°; 0–10 i 0–20 tak zabere 300°). */
  clicksPerTurn?: number;
  /** Měřítko celého knobu (výchozí HSC 0.74 = menší, LSC 1). */
  size?: number;
  ariaLabel?: string;
};

/** Barvy černého eloxu knobu: čelo, prstenec, odlesk, hrana. */
type Palette = { face: string; mid: string; light: string; dark: string };
const PAL_LSC: Palette = { face: "#1a1b1f", mid: "#202226", light: "#3a3d43", dark: "#050506" };
const PAL_HSC: Palette = { face: "#2c2f36", mid: "#4a4f58", light: "#7b8290", dark: "#101216" };

/* ======================= engine (stejný jako Fox) ======================= */
type KnobSpec = KnobValue & { key: string; cx: number; cy: number; size: number; title: string; clicksPerTurn: number; ariaLabel: string; onActive?: () => void };
type KnobState = { value: number; u: number; vel: number; free: number; dragging: boolean; raf: number; last: number };

function useReducedMotion() {
  const ref = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { ref.current = mq.matches; };
    sync(); mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return ref;
}

function useDialEngine(specs: KnobSpec[], direction: Direction, haptics: boolean) {
  const svgRef = useRef<SVGSVGElement>(null);
  const groups = useRef<Record<string, SVGGElement | null>>({});
  const states = useRef<Record<string, KnobState>>({});
  const specsRef = useRef(specs);
  const signRef = useRef(direction === "cw" ? 1 : -1);   // +1 = hodnota roste po směru hodin (jako Fox)
  const hapticsRef = useRef(haptics);
  const reduced = useReducedMotion();
  const drag = useRef<{ key: string | null; pid: number | null; lastPhi: number }>({ key: null, pid: null, lastPhi: 0 });

  // Synchronizace propů do refů mimo render (běží před ostatními efekty)
  useLayoutEffect(() => {
    specsRef.current = specs;
    signRef.current = direction === "cw" ? 1 : -1;
    hapticsRef.current = haptics;
  });

  const spec = (key: string) => specsRef.current.find((s) => s.key === key)!;
  const step = (key: string) => TAU / spec(key).clicksPerTurn;
  const state = (key: string) => {
    let s = states.current[key];
    if (!s) { const v = spec(key).value; s = states.current[key] = { value: v, u: v * step(key), vel: 0, free: 0, dragging: false, raf: 0, last: 0 }; }
    return s;
  };
  const render = (key: string) => {
    const g = groups.current[key];
    if (g) g.setAttribute("transform", `rotate(${(signRef.current * state(key).u * DEG).toFixed(3)})`);
  };
  const animate = (key: string) => {
    const s = state(key);
    if (s.raf) return;
    const tick = (now: number) => {
      const dt = Math.min(0.032, (now - (s.last || now)) / 1000) || 0.016;
      s.last = now;
      const target = s.value * step(key);
      const d = target - s.u;
      s.vel += (d * 420 - s.vel * 26) * dt;      // lehce podtlumená pružina = krátký dosed do kliku
      s.u += s.vel * dt;
      render(key);
      if (Math.abs(d) < 0.0008 && Math.abs(s.vel) < 0.01) { s.u = target; s.vel = 0; render(key); s.raf = 0; s.last = 0; return; }
      s.raf = requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);
  };
  const goTo = (key: string) => {
    const s = state(key);
    if (reduced.current) { s.u = s.value * step(key); s.vel = 0; render(key); return; }
    animate(key);
  };
  const setValue = (key: string, v: number) => {
    const s = state(key), sp = spec(key);
    v = Math.max(0, Math.min(sp.max, Math.round(v)));
    if (v === s.value) return;
    s.value = v;
    if (hapticsRef.current && "vibrate" in navigator) navigator.vibrate(8);
    sp.onChange(v);
  };
  const nudge = (key: string, d: number) => { spec(key).onActive?.(); setValue(key, state(key).value + d); goTo(key); };

  const local = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current!, b = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
    return { x: vb.x + ((e.clientX - b.left) / b.width) * vb.width, y: vb.y + ((e.clientY - b.top) / b.height) * vb.height };
  };
  const knobAt = (pt: { x: number; y: number }) => specsRef.current.find((s) => Math.hypot(pt.x - s.cx, pt.y - s.cy) <= R_HIT * s.size)?.key ?? null;
  const phi = (pt: { x: number; y: number }, key: string) => { const sp = spec(key); return Math.atan2(pt.y - sp.cy, pt.x - sp.cx); };

  const endDrag = (pointerId: number) => {
    const d0 = drag.current;
    if (!d0.key || pointerId !== d0.pid) return;
    const key = d0.key, s = state(key);
    s.dragging = false; drag.current = { key: null, pid: null, lastPhi: 0 };
    setValue(key, s.free / step(key)); goTo(key);
  };

  // Řízená hodnota zvenku (tlačítka ±, načtení uloženého nastavení)
  useEffect(() => {
    for (const sp of specs) { const s = state(sp.key); if (!s.dragging && s.value !== sp.value) { s.value = sp.value; goTo(sp.key); } }
  });
  useLayoutEffect(() => { for (const sp of specs) render(sp.key); });
  useEffect(() => () => { for (const k in states.current) if (states.current[k].raf) cancelAnimationFrame(states.current[k].raf); }, []);
  useEffect(() => {
    const svg = svgRef.current; if (!svg) return;
    const onWheel = (e: WheelEvent) => { const key = knobAt(local(e)); if (!key) return; e.preventDefault(); nudge(key, Math.sign(e.deltaY || e.deltaX)); };
    svg.addEventListener("wheel", onWheel, { passive: false });
    const end = (e: globalThis.PointerEvent) => endDrag(e.pointerId);   // pojistka, když capture nevyjde
    window.addEventListener("pointerup", end); window.addEventListener("pointercancel", end);
    return () => { svg.removeEventListener("wheel", onWheel); window.removeEventListener("pointerup", end); window.removeEventListener("pointercancel", end); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const pt = local(e), key = knobAt(pt);
    if (!key) return;
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* syntetické události */ }
    drag.current = { key, pid: e.pointerId, lastPhi: phi(pt, key) };
    const s = state(key);
    spec(key).onActive?.();
    if (s.raf) { cancelAnimationFrame(s.raf); s.raf = 0; s.last = 0; }
    s.dragging = true; s.free = s.u; s.vel = 0;
    groups.current[key]?.focus({ preventScroll: true });
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const d0 = drag.current;
    if (!d0.key || e.pointerId !== d0.pid) return;
    const key = d0.key;
    const p = phi(local(e), key);
    let d = p - d0.lastPhi;
    if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU;
    d0.lastPhi = p;
    const s = state(key), st = step(key), maxU = spec(key).max * st;
    let du = signRef.current * d;
    const over = s.free < 0 ? -s.free : s.free > maxU ? s.free - maxU : 0;
    if (over > 0) du *= Math.max(0.08, 0.35 - over);            // gumový doraz
    s.free += du;
    const nearest = Math.round(s.free / st) * st;
    const clamped = Math.max(-0.2, Math.min(maxU + 0.2, s.free));
    s.u = clamped <= 0 || clamped >= maxU ? clamped : nearest + (clamped - nearest) * 0.45;   // magnetický detent
    setValue(key, s.free / st);
    render(key);
  };
  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => endDrag(e.pointerId);

  const knobProps = (key: string) => {
    const sp = spec(key);
    return {
      ref: (el: SVGGElement | null) => { groups.current[key] = el; },
      tabIndex: 0, role: "slider" as const, className: "cc-knob", style: { outline: "none" } as CSSProperties,
      "aria-label": sp.ariaLabel, "aria-valuemin": 0, "aria-valuemax": sp.max, "aria-valuenow": sp.value,
      "aria-valuetext": `${sp.value} z ${sp.max} kliků od zavřeno`,
      onKeyDown: (e: KeyboardEvent<SVGGElement>) => {
        const map: Record<string, number> = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 4, PageDown: -4 };
        let d = map[e.key];
        if (e.key === "Home") d = -state(key).value;
        if (e.key === "End") d = sp.max - state(key).value;
        if (d === undefined) return;
        e.preventDefault(); nudge(key, d);
      },
      onFocus: () => sp.onActive?.(),
    };
  };

  return { svgProps: { ref: svgRef, onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp }, knobProps };
}

/* ======================= jeden knob ======================= */
function ArcArrow({ geom }: { geom: { shaft: string; head: string } }) {
  const st = { fill: "none", stroke: "#f2f3f5", strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (<><path d={geom.shaft} {...st} /><polyline points={geom.head} {...st} /></>);
}
type KnobArtProps = { spec: KnobSpec; sign: number; u: (n: string) => string; id: (n: string) => string; knobProps: ReturnType<ReturnType<typeof useDialEngine>["knobProps"]> };
function Knob({ spec, sign, u, id, knobProps }: KnobArtProps) {
  const k = spec.key;
  // SOFT = přibývání kliků (šipka ve směru sign), FIRM = ubývání (proti); oba na spodní polovině prstence
  const soft = { mid: sign > 0 ? 122 : -122, from: sign > 0 ? 154 : -154, to: sign > 0 ? 166 : -166 };
  const firm = { mid: sign > 0 ? -122 : 122, from: sign > 0 ? -154 : 154, to: sign > 0 ? -166 : 166 };
  return (
    <g transform={`translate(${spec.cx} ${spec.cy}) scale(${spec.size})`}>
      <defs>
        <path id={id(`arc-${k}-title`)} d={textArc(R_TEXT, 0, 234, true)} fill="none" />
        <path id={id(`arc-${k}-soft`)} d={textArc(R_TEXT, soft.mid, 56, false)} fill="none" />
        <path id={id(`arc-${k}-firm`)} d={textArc(R_TEXT, firm.mid, 56, false)} fill="none" />
      </defs>
      <g filter={u("drop")}>
        {/* rotující knob: prstenec s nápisem, šipky, zapuštěné čelo s imbusem, bílá ryska */}
        <g {...knobProps}>
          <circle r={R_KNOB} fill={u(`anod-${spec.key}`)} />
          <circle r={R_KNOB - 1} fill="none" stroke={u("bevel")} strokeWidth={2} opacity={0.55} />
          <circle r={R_KNOB * 0.56} fill="none" stroke="#000" strokeOpacity={0.45} strokeWidth={1.5} />
          <text className="cc-etch" fontSize={15.5} letterSpacing={2.6}><textPath href={`#${id(`arc-${k}-title`)}`} startOffset="50%" textAnchor="middle">{spec.title}</textPath></text>
          <text className="cc-etch" fontSize={11} letterSpacing={2}><textPath href={`#${id(`arc-${k}-soft`)}`} startOffset="50%" textAnchor="middle">SOFT −</textPath></text>
          <ArcArrow geom={arcArrowGeom(R_TEXT, soft.from, soft.to)} />
          <text className="cc-etch" fontSize={11} letterSpacing={2}><textPath href={`#${id(`arc-${k}-firm`)}`} startOffset="50%" textAnchor="middle">FIRM +</textPath></text>
          <ArcArrow geom={arcArrowGeom(R_TEXT, firm.from, firm.to)} />
          <circle r={R_FACE} fill={u("well")} />
          <circle r={24} fill={u("steel")} />
          <circle r={24} fill="none" stroke="#000" strokeOpacity={0.5} strokeWidth={1} />
          <polygon points={HEX} fill={u("hexHole")} />
          <polygon points={HEX} fill="none" stroke="#fff" strokeOpacity={0.18} strokeWidth={1} />
          {/* bílá ryska ukazatele (12 hodin) – v hladké části prstence pod nápisem, míří ven na stupnici */}
          <rect x={-2} y={-R_MARK_OUT} width={4} height={R_MARK_OUT - R_MARK_IN} rx={2} fill="#fff" />
        </g>
      </g>
      {/* statické světlo */}
      <circle r={R_KNOB} fill={u("sheen")} pointerEvents="none" />
      <circle className="cc-focus" r={R_KNOB + 6} fill="none" stroke="currentColor" strokeWidth={2.5} pointerEvents="none" />
    </g>
  );
}

/* ======================= komponenta ======================= */
export type CaneCreekCompressionDialProps = {
  lsc: KnobValue;
  hsc: KnobValue;
  direction?: Direction;
  haptics?: boolean;
  onActive?: (knob: "lsc" | "hsc") => void;
  /** Vykreslit tmavý můstek nádobky pod knoby (výchozí false = průhledné pozadí, jen knoby). */
  bridge?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function CaneCreekCompressionDial({ lsc, hsc, direction = "cw", haptics = true, onActive, bridge = false, className, style }: CaneCreekCompressionDialProps) {
  const uid = useId().replace(/:/g, "");
  const id = (n: string) => `${uid}-${n}`;
  const u = (n: string) => `url(#${id(n)})`;
  const sign = direction === "cw" ? 1 : -1;
  const stops = (p: Palette) => (
    <>
      <stop offset="0" stopColor={p.face} /><stop offset="0.52" stopColor={p.face} /><stop offset="0.56" stopColor={p.dark} />
      <stop offset="0.60" stopColor={p.light} /><stop offset="0.66" stopColor={p.mid} /><stop offset="0.93" stopColor={p.mid} />
      <stop offset="0.97" stopColor={p.light} /><stop offset="1" stopColor={p.dark} />
    </>
  );

  const specs: KnobSpec[] = [
    { key: "hsc", cx: 160, cy: 86, size: hsc.size ?? 0.74, title: "HIGH SPEED COMPRESSION", clicksPerTurn: hsc.clicksPerTurn ?? 12, ariaLabel: hsc.ariaLabel ?? "HSC, high-speed compression", onActive: () => onActive?.("hsc"), ...hsc },
    { key: "lsc", cx: 160, cy: 282, size: lsc.size ?? 1, title: "LOW SPEED COMPRESSION", clicksPerTurn: lsc.clicksPerTurn ?? 24, ariaLabel: lsc.ariaLabel ?? "LSC, low-speed compression", onActive: () => onActive?.("lsc"), ...lsc },
  ];
  const { svgProps, knobProps } = useDialEngine(specs, direction, haptics);

  return (
    <svg viewBox="0 0 320 400" {...svgProps} className={className} role="group" aria-label="Nastavení komprese zadního tlumiče"
         style={{ display: "block", width: "100%", height: "auto", overflow: "visible", userSelect: "none", touchAction: "none", cursor: "grab", ...style }}>
      <defs>
        <linearGradient id={id("bridge")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0c0d0f" /><stop offset="0.18" stopColor="#26282c" /><stop offset="0.5" stopColor="#1a1b1e" /><stop offset="0.82" stopColor="#232529" /><stop offset="1" stopColor="#08090a" />
        </linearGradient>
        {/* eloxovaný knob: zapuštěné čelo, sražení, vyvýšený prstenec s nápisem – souměrný podle osy, aby mohl rotovat */}
        <radialGradient id={id("anod-lsc")}>{stops(PAL_LSC)}</radialGradient>
        <radialGradient id={id("anod-hsc")}>{stops(PAL_HSC)}</radialGradient>
        <radialGradient id={id("steel")} cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#e2e4e8" /><stop offset="0.45" stopColor="#9ea1a8" /><stop offset="0.8" stopColor="#5b5e65" /><stop offset="1" stopColor="#2c2e33" />
        </radialGradient>
        <radialGradient id={id("hexHole")}>
          <stop offset="0" stopColor="#050506" /><stop offset="0.8" stopColor="#0d0e10" /><stop offset="1" stopColor="#2a2c31" />
        </radialGradient>
        <linearGradient id={id("sheen")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={0.22} /><stop offset="0.45" stopColor="#fff" stopOpacity={0} />
          <stop offset="0.62" stopColor="#000" stopOpacity={0} /><stop offset="1" stopColor="#000" stopOpacity={0.45} />
        </linearGradient>
        <linearGradient id={id("bevel")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={0.6} /><stop offset="0.5" stopColor="#fff" stopOpacity={0.05} /><stop offset="1" stopColor="#000" stopOpacity={0.7} />
        </linearGradient>
        <radialGradient id={id("well")}>
          <stop offset="0.80" stopColor="#000" stopOpacity={0} /><stop offset="1" stopColor="#000" stopOpacity={0.55} />
        </radialGradient>
        <filter id={id("drop")} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#000" floodOpacity={0.7} />
        </filter>
      </defs>
      <style>{`
        .cc-etch{font-family:Archivo,system-ui,sans-serif;font-weight:800;fill:#f2f3f5}
        .cc-focus{opacity:0}g:has(.cc-knob:focus-visible)~.cc-focus{opacity:1}
      `}</style>

      {bridge && (
        <>
          <rect x={44} y={6} width={232} height={388} rx={42} fill={u("bridge")} />
          <rect x={44} y={6} width={232} height={388} rx={42} fill="none" stroke="#fff" strokeOpacity={0.07} />
        </>
      )}
      <Knob spec={specs[0]} sign={sign} u={u} id={id} knobProps={knobProps("hsc")} />
      <Knob spec={specs[1]} sign={sign} u={u} id={id} knobProps={knobProps("lsc")} />
    </svg>
  );
}

export default CaneCreekCompressionDial;
