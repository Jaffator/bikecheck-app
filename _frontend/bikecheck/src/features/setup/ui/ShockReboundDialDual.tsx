/**
 * CaneCreekReboundDial — dva červené rádlované knoby odskoku Cane Creek Kitsuma (HSR nahoře, LSR dole), boční pohled.
 * React + SVG, bez závislostí, průhledné pozadí (žádné tělo tlumiče). Nápis LSR / HSR je vyrytý přímo na válci
 * a točí se s ním. Hladké žlábky v rádlování: jeden klik = posun o jeden žlábek (60°).
 *
 *   <CaneCreekReboundDial
 *     lsr={{ value: lsr, max: 20, onChange: setLsr }}
 *     hsr={{ value: hsr, max: 10, onChange: setHsr }}
 *   />
 *
 * Hodnota = kliky od plně zavřeno. Výchozí `direction="right"`: kliky přibývají posunem povrchu doprava (k FAST),
 * posunem doleva (k SLOW) ubývají až na doraz v nule. `direction="left"` obrací.
 * Ovládání: tažení válcem do strany, kolečko, šipky / PageUp / PageDown / Home / End, vlastní tlačítka ±.
 * Respektuje prefers-reduced-motion, vibruje při kliku (Android).
 */
import { useEffect, useId, useLayoutEffect, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";

const TAU = Math.PI * 2;
const R = 120, H = 122;                                                   // poloměr a výška válce
const KNURL = { n: 64, helix: 0.45, y0: 8, y1: H - 8, N: 7 };            // rádlování: počet rýh, zkrut šroubovice, rozsah, segmenty
const FLUTES = { n: 6, hw: 0.11, y0: 14, y1: H - 14 };                    // hladké žlábky: počet, poloviční úhlová šířka (rad), rozsah
const BAND = { y0: 42, y1: 80, font: 26 };                                // hladký pás s vyrytým nápisem
const HIT = 6;                                                            // přesah hit-area kolem válce
const RIDGES = Array.from({ length: KNURL.n }, (_, i) => (i / KNURL.n) * TAU);
const FLUTE_PHI = Array.from({ length: FLUTES.n }, (_, i) => (i / FLUTES.n) * TAU);
const LETTER_STEP = (BAND.font * 0.8) / R;                                // úhlová rozteč písmen = délka oblouku / R
const f = (n: number) => n.toFixed(2);

export type Direction = "left" | "right";
export type KnobValue = {
  value: number;
  max: number;
  onChange: (value: number) => void;
  /** Kliků na otáčku (výchozí 6 = 60°, tedy jeden klik = jeden žlábek; při jiné hodnotě žlábky s kliky nelícují). */
  clicksPerTurn?: number;
  ariaLabel?: string;
};

/* ======================= engine ======================= */
type KnobSpec = KnobValue & { key: string; cx: number; top: number; text: string; clicksPerTurn: number; ariaLabel: string; onActive?: () => void };
type KnobState = { value: number; u: number; vel: number; free: number; dragging: boolean; raf: number; last: number };
type KnobNodes = { light: (SVGPathElement | null)[]; dark: (SVGPathElement | null)[]; flutes: (SVGRectElement | null)[]; letters: (SVGTextElement | null)[] };

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

/**
 * Válec viděný z boku. Bod s vlastním úhlem φ se zobrazí na x = R·sin ψ, ψ = sgn·(φ − w), viditelný jen cos ψ > 0.
 * w = natočení (rad), sgn = +1 → s rostoucí hodnotou povrch ujíždí doleva.
 */
const inFlute = (psi: number, w: number, sgn: number) => {
  for (const phi of FLUTE_PHI) {
    let d = (psi - sgn * (phi - w)) % TAU;
    if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU;
    if (Math.abs(d) < FLUTES.hw) return true;
  }
  return false;
};
// Rýha rádlování je šroubovice po výšce válce; u okraje (malé cos ψ) tenčí a průhlednější, v žlábcích přerušená
const helixPath = (node: SVGPathElement | null, base: number, twist: number, w: number, sgn: number) => {
  if (!node) return;
  let d = "", pen = false, sumC = 0, n = 0;
  for (let k = 0; k <= KNURL.N; k++) {
    const t = k / KNURL.N;
    const psi = sgn * (base - w) + twist * (t - 0.5);
    const c = Math.cos(psi);
    if (c <= 0.03 || inFlute(psi, w, sgn)) { pen = false; continue; }
    d += (pen ? "L" : "M") + f(R * Math.sin(psi)) + " " + f(KNURL.y0 + (KNURL.y1 - KNURL.y0) * t);
    pen = true; sumC += c; n++;
  }
  const mean = n ? sumC / n : 0;
  node.setAttribute("d", d);
  node.setAttribute("opacity", mean.toFixed(3));
  node.setAttribute("stroke-width", (0.35 + 1.5 * mean).toFixed(2));
};
const placeFlute = (node: SVGRectElement | null, phi: number, w: number, sgn: number) => {
  if (!node) return;
  const psi = sgn * (phi - w), c = Math.cos(psi);
  if (c <= 0.1) { node.setAttribute("opacity", "0"); return; }
  const x1 = R * Math.sin(psi - FLUTES.hw), x2 = R * Math.sin(psi + FLUTES.hw);
  node.setAttribute("x", f(Math.min(x1, x2))); node.setAttribute("width", f(Math.max(0.5, Math.abs(x2 - x1))));
  node.setAttribute("opacity", Math.min(1, 0.15 + c).toFixed(3));
};
// Písmeno obalené kolem válce: vodorovně stlačené cos ψ, u okraje průhlednější
const placeLetter = (node: SVGTextElement | null, phi: number, w: number, sgn: number) => {
  if (!node) return;
  const psi = sgn * (phi - w), c = Math.cos(psi);
  if (c <= 0.05) { node.setAttribute("opacity", "0"); return; }
  node.setAttribute("transform", `translate(${f(R * Math.sin(psi))} 0) scale(${c.toFixed(3)} 1)`);
  node.setAttribute("opacity", Math.min(1, 0.25 + c).toFixed(3));
};

function useDialEngine(specs: KnobSpec[], direction: Direction, haptics: boolean) {
  const svgRef = useRef<SVGSVGElement>(null);
  const groups = useRef<Record<string, SVGGElement | null>>({});
  const nodes = useRef<Record<string, KnobNodes>>({});
  const states = useRef<Record<string, KnobState>>({});
  // Latest props for the pointer handlers to read; written after the render, never during it.
  const specsRef = useRef(specs);
  const sgnRef = useRef(direction === "left" ? 1 : -1);
  const hapticsRef = useRef(haptics);
  useEffect(() => {
    specsRef.current = specs;
    sgnRef.current = direction === "left" ? 1 : -1;
    hapticsRef.current = haptics;
  });
  const reduced = useReducedMotion();
  const drag = useRef<{ key: string | null; pid: number | null; lastX: number }>({ key: null, pid: null, lastX: 0 });

  const spec = (key: string) => specsRef.current.find((s) => s.key === key)!;
  const step = (key: string) => TAU / spec(key).clicksPerTurn;
  const nodesOf = (key: string) => (nodes.current[key] ??= { light: [], dark: [], flutes: [], letters: [] });
  const state = (key: string) => {
    let s = states.current[key];
    if (!s) { const v = spec(key).value; s = states.current[key] = { value: v, u: v * step(key), vel: 0, free: 0, dragging: false, raf: 0, last: 0 }; }
    return s;
  };
  const render = (key: string) => {
    const s = state(key), sgn = sgnRef.current, n = nodesOf(key), text = spec(key).text, mid = (text.length - 1) / 2;
    RIDGES.forEach((phi, i) => {
      helixPath(n.light[i], phi, +KNURL.helix, s.u, sgn);
      helixPath(n.dark[i], phi + Math.PI / KNURL.n, -KNURL.helix, s.u, sgn);
    });
    FLUTE_PHI.forEach((phi, i) => placeFlute(n.flutes[i], phi, s.u, sgn));
    // Písmena dvakrát proti sobě; pořadí čtení zleva doprava nezávisle na směru otáčení
    [0, Math.PI].forEach((phase, p) => {
      for (let j = 0; j < text.length; j++) placeLetter(n.letters[p * text.length + j], phase + sgn * (j - mid) * LETTER_STEP, s.u, sgn);
    });
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
  const knobAt = (pt: { x: number; y: number }) =>
    specsRef.current.find((s) => Math.abs(pt.x - s.cx) <= R + HIT && pt.y >= s.top - HIT && pt.y <= s.top + H + HIT)?.key ?? null;

  const endDrag = (pointerId: number) => {
    const d0 = drag.current;
    if (!d0.key || pointerId !== d0.pid) return;
    const key = d0.key, s = state(key);
    s.dragging = false; drag.current = { key: null, pid: null, lastX: 0 };
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
    const key = knobAt(local(e));
    if (!key) return;
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* syntetické události */ }
    drag.current = { key, pid: e.pointerId, lastX: e.clientX };
    const s = state(key);
    spec(key).onActive?.();
    if (s.raf) { cancelAnimationFrame(s.raf); s.raf = 0; s.last = 0; }
    s.dragging = true; s.free = s.u; s.vel = 0;
    groups.current[key]?.focus({ preventScroll: true });
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const d0 = drag.current;
    if (!d0.key || e.pointerId !== d0.pid) return;
    const dx = e.clientX - d0.lastX; d0.lastX = e.clientX;
    const svg = e.currentTarget, scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
    const key = d0.key, s = state(key), st = step(key), maxU = spec(key).max * st;
    let du = (-sgnRef.current * dx) / (R * scale);              // povrch sleduje prst: 1 px na obrazovce = 1 px oblouku
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

  return { svgProps: { ref: svgRef, onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp }, knobProps, nodesOf };
}

/* ======================= jeden knob ======================= */
type KnobArtProps = {
  spec: KnobSpec; u: (n: string) => string; id: (n: string) => string;
  knobProps: ReturnType<ReturnType<typeof useDialEngine>["knobProps"]>;
  nodes: KnobNodes;
};
function Knob({ spec, u, id, knobProps, nodes }: KnobArtProps) {
  // Each collection is filled by its own ref callback, so none is written through `nodes`.
  const { light, dark, flutes, letters } = nodes;
  const clipId = id(`clip-${spec.key}`);
  const chars = [...spec.text];
  return (
    <g transform={`translate(${spec.cx} ${spec.top})`}>
      <clipPath id={clipId}><rect x={-R} y={0} width={2 * R} height={H} rx={6} /></clipPath>
      <g filter={u("drop")}>
        <g clipPath={`url(#${clipId})`}>
          {/* rotující obsah válce: elox, rádlování, žlábky, pás s nápisem */}
          <g {...knobProps}>
            <rect x={-R} y={0} width={2 * R} height={H} fill={u("anod")} />
            <g fill="none" strokeLinecap="round">
              {RIDGES.map((_, i) => (
                <g key={i}>
                  <path ref={(el) => { light[i] = el; }} stroke="#ffd0d8" strokeOpacity={0.42} />
                  <path ref={(el) => { dark[i] = el; }} stroke="#2a0309" strokeOpacity={0.5} />
                </g>
              ))}
            </g>
            {FLUTE_PHI.map((_, i) => <rect key={i} ref={(el) => { flutes[i] = el; }} y={FLUTES.y0} height={FLUTES.y1 - FLUTES.y0} rx={5} fill={u("flute")} />)}
            <rect x={-R} y={BAND.y0} width={2 * R} height={BAND.y1 - BAND.y0} fill={u("anod")} />
            <rect x={-R} y={BAND.y0} width={2 * R} height={BAND.y1 - BAND.y0} fill={u("band")} />
            {[0, 1].flatMap((p) => chars.map((ch, j) => (
              <text key={`${p}-${j}`} ref={(el) => { letters[p * chars.length + j] = el; }} className="cc-lbl" y={(BAND.y0 + BAND.y1) / 2 + 1} fontSize={BAND.font}>{ch}</text>
            )))}
          </g>
          {/* statické: zkosené hrany, spekulár, ztmavené okraje válce */}
          <rect x={-R} y={0} width={2 * R} height={6} fill={u("chamfer")} opacity={0.85} />
          <rect x={-R} y={H - 6} width={2 * R} height={6} fill={u("chamfer")} opacity={0.7} />
          <rect x={-R * 0.5} y={0} width={R * 0.15} height={H} fill="#fff" opacity={0.09} />
          <rect x={-R} y={0} width={34} height={H} fill={u("edgeL")} />
          <rect x={R - 34} y={0} width={34} height={H} fill={u("edgeR")} />
        </g>
      </g>
      <rect className="cc-focus" x={-R - 4} y={-4} width={2 * R + 8} height={H + 8} rx={9} fill="none" stroke="currentColor" strokeWidth={2.5} pointerEvents="none" />
    </g>
  );
}

/* ======================= směrový popis mezi knoby ======================= */
type DirectionHintProps = { y: number; direction: Direction };
// Šipky do stran s nápisem FAST / SLOW v mezeře mezi LSR a HSR; strany se prohodí podle `direction`.
function DirectionHint({ y, direction }: DirectionHintProps) {
  const [left, right] = direction === "right" ? ["+ SLOW", "FAST −"] : ["− FAST", "SLOW +"];
  const x0 = 160 - R, x1 = 160 + R, pad = 10, fs = 18, gap = 8;
  return (
    <g className="cc-hint" fontSize={fs} pointerEvents="none">
      <path d={`M${x0 + pad + 8} ${y - 7} L${x0 + pad} ${y} L${x0 + pad + 8} ${y + 7}`} />
      <text x={x0 + pad + 8 + gap} y={y} textAnchor="start">{left}</text>
      <text x={x1 - pad - 8 - gap} y={y} textAnchor="end">{right}</text>
      <path d={`M${x1 - pad - 8} ${y - 7} L${x1 - pad} ${y} L${x1 - pad - 8} ${y + 7}`} />
    </g>
  );
}

/* ======================= komponenta ======================= */
export type CaneCreekReboundDialProps = {
  lsr: KnobValue;
  hsr: KnobValue;
  direction?: Direction;
  haptics?: boolean;
  onActive?: (knob: "lsr" | "hsr") => void;
  className?: string;
  style?: CSSProperties;
};

export function CaneCreekReboundDial({ lsr, hsr, direction = "right", haptics = true, onActive, className, style }: CaneCreekReboundDialProps) {
  const uid = useId().replace(/:/g, "");
  const id = (n: string) => `${uid}-${n}`;
  const u = (n: string) => `url(#${id(n)})`;

  const specs: KnobSpec[] = [
    { key: "lsr", cx: 160, top: 196, text: "LSR", clicksPerTurn: lsr.clicksPerTurn ?? FLUTES.n, ariaLabel: lsr.ariaLabel ?? "LSR, low-speed rebound", onActive: () => onActive?.("lsr"), ...lsr },
    { key: "hsr", cx: 160, top: 12, text: "HSR", clicksPerTurn: hsr.clicksPerTurn ?? FLUTES.n, ariaLabel: hsr.ariaLabel ?? "HSR, high-speed rebound", onActive: () => onActive?.("hsr"), ...hsr },
  ];
  const { svgProps, knobProps, nodesOf } = useDialEngine(specs, direction, haptics);

  return (
    <svg viewBox="0 0 320 330" {...svgProps} className={className} role="group" aria-label="Nastavení odskoku (rebound) Cane Creek Kitsuma"
         style={{ display: "block", width: "100%", height: "auto", overflow: "visible", userSelect: "none", touchAction: "none", cursor: "grab", ...style }}>
      <defs>
        <linearGradient id={id("anod")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3a050e" /><stop offset="0.12" stopColor="#8f0f26" /><stop offset="0.30" stopColor="#ee4a66" />
          <stop offset="0.46" stopColor="#d5173a" /><stop offset="0.72" stopColor="#a5122b" /><stop offset="0.90" stopColor="#5e0a19" /><stop offset="1" stopColor="#2a0409" />
        </linearGradient>
        <linearGradient id={id("chamfer")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2a0409" /><stop offset="0.3" stopColor="#ff8aa0" /><stop offset="0.5" stopColor="#b8142f" /><stop offset="1" stopColor="#2a0409" />
        </linearGradient>
        <linearGradient id={id("flute")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity={0.6} /><stop offset="0.18" stopColor="#000" stopOpacity={0.12} />
          <stop offset="0.45" stopColor="#fff" stopOpacity={0.14} /><stop offset="0.8" stopColor="#000" stopOpacity={0.18} /><stop offset="1" stopColor="#000" stopOpacity={0.6} />
        </linearGradient>
        <linearGradient id={id("band")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity={0.45} /><stop offset="0.12" stopColor="#000" stopOpacity={0.05} />
          <stop offset="0.88" stopColor="#000" stopOpacity={0.05} /><stop offset="1" stopColor="#fff" stopOpacity={0.18} />
        </linearGradient>
        <linearGradient id={id("edgeL")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity={0.75} /><stop offset="1" stopColor="#000" stopOpacity={0} />
        </linearGradient>
        <linearGradient id={id("edgeR")} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity={0.75} /><stop offset="1" stopColor="#000" stopOpacity={0} />
        </linearGradient>
        <filter id={id("drop")} x="-10%" y="-20%" width="120%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#000" floodOpacity={0.55} />
        </filter>
      </defs>
      <style>{`
        .cc-lbl{font-family:Archivo,system-ui,sans-serif;font-weight:900;fill:#fff;text-anchor:middle;dominant-baseline:central;paint-order:stroke;stroke:rgba(40,0,6,.6);stroke-width:1.6px}
        .cc-focus{opacity:0}g:has(.cc-knob:focus-visible)~.cc-focus{opacity:1}
        .cc-hint{font-family:Archivo,system-ui,sans-serif;font-weight:700;letter-spacing:.08em;fill:#c9ccd1;stroke:#c9ccd1;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
        .cc-hint text{stroke:none;dominant-baseline:central}
        .cc-hint path{fill:none}
      `}</style>

      <Knob spec={specs[1]} u={u} id={id} knobProps={knobProps("hsr")} nodes={nodesOf("hsr")} />
      <DirectionHint y={(specs[1].top + H + specs[0].top) / 2} direction={direction} />
      <Knob spec={specs[0]} u={u} id={id} knobProps={knobProps("lsr")} nodes={nodesOf("lsr")} />
    </svg>
  );
}

export default CaneCreekReboundDial;
