// The hero's terrain rolls left under a rider who stays put. Wear builds up roughly as the
// App counts it: climbs on the chain, descents mostly on the pads (their index is downhill only).
var SVG_NS = "http://www.w3.org/2000/svg";
var KM_PER_S = 0.6;
var WEAR = {
  climb: { chain: 4.8, brakes: 0, fork: 0 },
  descent: { chain: 0.66, brakes: 5.6, fork: 2.75 },
};
var MARKS = {
  chain: { cs: "Výměna řetězu", en: "Chain swap" },
  brakes: { cs: "Výměna destiček", en: "Pad swap" },
  fork: { cs: "Servis vidlice", en: "Fork service" },
};
// From lg up the terrain fills the hero behind the copy; below it, a band of its own.
var RIDGE_LAYOUTS = {
  wide: {
    lines: 28,
    gap: 13,
    rise: 300,
    lead: 0.07,
    curve: 1.35,
    tower: 0.6,
    drop: 190,
    rider: 0.764,
    step: 12,
    speed: 50,
    mPerPx: 1.6,
  },
  narrow: {
    lines: 22,
    gap: 4,
    rise: 100,
    lead: 0,
    curve: 0.8,
    tower: 0.8,
    floor: 22,
    rider: 0.72,
    step: 8,
    speed: 40,
    mPerPx: 4,
  },
  // The closing band from lg up: the narrow shape, wider and taller.
  band: {
    lines: 28,
    gap: 5,
    rise: 120,
    lead: 0,
    curve: 1,
    tower: 0.7,
    floor: 30,
    rider: 0.72,
    step: 10,
    speed: 45,
    mPerPx: 3,
  },
};
var RIDGE_STILL = { km: 12.4, gain: 380, chain: 38, brakes: 21, fork: 12.5 };
var FORK_SERVICE_H = 50;
// Part-worn at the start, each at a different stage, so the first service lands in seconds and the rest take turns.
var RIDGE_START = { chain: 85, brakes: 55, fork: 11 };
// A part due sooner waits at its limit, so two labels never land on top of each other.
var MARK_GAP_S = 6;
// The skyline the farther rows hide behind, kept finer than any row's samples.
var SKY_STEP = 2;

// A sine folded at its zero crossings: sharp crests, round valleys. Rounded towards the trail (d = 0) so it rides smooth.
function crest(t, d) {
  var c = 1 - Math.abs(Math.sin(t));
  var round = (1 + Math.cos(2 * t)) / 2; // the same wave without the cusp
  return Math.pow(c + (round - c) * (1 - d), 2);
}

// 0..1 at depth d (0 = the trail, 1 = the farthest row); each row a slice of one range, rougher further back.
function mountainNoise(s, d) {
  var massif = crest(s * 0.0042 + d * 1.9 + 0.6, d);
  var peaks = crest(s * 0.0111 - d * 2.7 + 2.1, d);
  var spurs = crest(s * 0.0263 + d * 4.3 + 0.9, d);
  var scree = crest(s * 0.057 - d * 6.1 + 3.3, d);
  return (0.6 * massif + 0.4 * peaks + d * (0.22 * spurs + 0.1 * scree)) / (1 + 0.32 * d);
}

function svgElement(tag, attrs) {
  var node = document.createElementNS(SVG_NS, tag);
  Object.keys(attrs).forEach(function (key) {
    node.setAttribute(key, attrs[key]);
  });
  return node;
}

function ridge(section) {
  var box = section.querySelector(".ridge");
  // The closing band rests on its section floor: no readout and no buttons to hang from.
  var band = box.classList.contains("ridge-band");
  var svg = box.querySelector("svg");
  var readout = section.querySelector(".readout");
  var cells = readout && {
    chain: readout.querySelector('[data-reading="chain"]'),
    brakes: readout.querySelector('[data-reading="brakes"]'),
    fork: readout.querySelector('[data-reading="fork"]'),
  };
  var riderLabel = box.querySelector(".ridge-rider");
  var title = section.querySelector("h1, h2");
  var wide = window.matchMedia("(min-width: 1024px)");
  var state = { offset: 0, time: 0, km: 0, gain: 0, climbing: true, marks: [], sinceMark: MARK_GAP_S };
  Object.assign(state, RIDGE_START);
  var view = { layout: null, w: 0, h: 0, base: 0, end: 0 };
  var parts = null;
  var trail = null;
  var raf = 0;
  var prev = 0;
  var inView = !("IntersectionObserver" in window);

  if (reduced) Object.assign(state, RIDGE_STILL);

  // Farther rows stand taller, so the back of the range rises over the front.
  function height(s, x, d) {
    var L = view.layout;
    var envelope = Math.pow(Math.max(0, x / view.w - L.lead), L.curve) * L.rise + 12;
    return envelope * (1 + L.tower * d) * (0.12 + 0.88 * mountainNoise(s, d));
  }

  // The shift between neighbouring lines is the angle the range is seen from. It swings back and
  // forth, as fast as the mock's parallax turns it.
  function shear() {
    return 26 * Math.cos((2 * Math.PI * state.time) / 90);
  }

  function riderX() {
    return Math.round(view.w * view.layout.rider);
  }

  // Below lg the band fills the gap left above the buttons, its floor just over them.
  function hang() {
    if (band || wide.matches) return;
    var buttonsTop =
      section.querySelector("#download").getBoundingClientRect().top - section.getBoundingClientRect().top;
    var base = box.clientHeight - RIDGE_LAYOUTS.narrow.floor;
    box.style.setProperty("--ridge-top", Math.round(buttonsTop - 32 - base) + "px");
  }

  // From lg up the floor hangs off the buttons (drop px under their top), so the window's height doesn't move it.
  function floorY(L) {
    if (band || !wide.matches) return box.clientHeight - L.floor;
    var buttons = section.querySelector("#download").getBoundingClientRect();
    return Math.round(buttons.top - box.getBoundingClientRect().top + L.drop);
  }

  function layout() {
    if (!wide.matches) return RIDGE_LAYOUTS.narrow;
    return band ? RIDGE_LAYOUTS.band : RIDGE_LAYOUTS.wide;
  }

  function build() {
    var L = layout();
    var base = floorY(L);
    var same = box.clientWidth === view.w && box.clientHeight === view.h && base === view.base;
    if (L === view.layout && same) return;
    view = { layout: L, w: box.clientWidth, h: box.clientHeight, base: base };
    // The fade into the facts starts on the terrain's floor, wherever that lands.
    box.style.setProperty("--ridge-floor", base + "px");
    view.end = Math.ceil(view.w / L.step) * L.step;
    svg.setAttribute("viewBox", "0 0 " + view.w + " " + view.h);
    if (parts) parts.layer.remove();
    parts = { layer: svgElement("g", {}), lines: [] };
    for (var i = L.lines - 1; i >= 0; i--) {
      var front = i === 0;
      parts.lines[i] = svgElement("path", {
        fill: "none",
        stroke: front ? "#cec053" : "#f2f2f1",
        "stroke-opacity": front ? 1 : (0.42 - (i / (L.lines - 1)) * 0.37).toFixed(3),
        "stroke-width": front ? 1.6 : 1,
        "stroke-linejoin": "round",
      });
      parts.layer.appendChild(parts.lines[i]);
    }
    parts.fill = svgElement("path", { fill: "url(#ridge-fill)" });
    parts.marks = svgElement("g", {});
    parts.stem = svgElement("line", { stroke: "#cec053", "stroke-opacity": 0.5, "stroke-width": 1 });
    parts.rider = svgElement("circle", { r: 4.5, fill: "#cec053" });
    parts.layer.append(parts.fill, parts.marks, parts.stem, parts.rider);
    state.marks.forEach(function (m) {
      parts.marks.append(m.stem, m.dot);
    });
    svg.appendChild(parts.layer);
  }

  // Samples sit on fixed points of the terrain and ride with it; a grid fixed to the screen
  // would catch every crest at a different spot each frame and make the lines flicker.
  function row(i, shift) {
    var L = view.layout;
    var phase = ((shift % L.step) + L.step) % L.step;
    var r = { phase: phase, xs: [], ys: [] };
    for (var x = -phase; x < view.end + L.step; x += L.step) {
      r.xs.push(x);
      r.ys.push(view.base - i * L.gap - height(shift + x, x, i / (L.lines - 1)));
    }
    return r;
  }

  function rowY(r, x) {
    var at = (x + r.phase) / view.layout.step;
    var k = Math.max(0, Math.min(Math.floor(at), r.ys.length - 2));
    return r.ys[k] + (at - k) * (r.ys[k + 1] - r.ys[k]);
  }

  function skyAt(sky, x) {
    var at = Math.max(0, Math.min(x / SKY_STEP, sky.length - 1));
    var k = Math.min(Math.floor(at), sky.length - 2);
    return sky[k] + (at - k) * (sky[k + 1] - sky[k]);
  }

  function point(x, y) {
    return x.toFixed(1) + " " + y.toFixed(1);
  }

  // Only what rises above every row in front is drawn (a floating horizon), cut where it meets the skyline.
  function visibleD(r, sky) {
    var d = "";
    var prev = 0;
    for (var k = 0; k < r.xs.length; k++) {
      var cut = skyAt(sky, r.xs[k]) - r.ys[k];
      if (k && cut >= 0 !== prev >= 0) {
        var t = prev / (prev - cut);
        d +=
          (cut >= 0 ? "M" : "L") +
          point(r.xs[k - 1] + t * view.layout.step, r.ys[k - 1] + t * (r.ys[k] - r.ys[k - 1]));
      }
      if (cut >= 0) d += (k ? "L" : "M") + point(r.xs[k], r.ys[k]);
      prev = cut;
    }
    return d;
  }

  function lowerSky(sky, r) {
    for (var k = 0; k < sky.length; k++) sky[k] = Math.min(sky[k], rowY(r, k * SKY_STEP));
  }

  function place(label, x, y) {
    label.style.transform = "translate(" + x + "px," + y + "px)";
  }

  function setLine(line, x, y1, y2) {
    line.setAttribute("x1", x);
    line.setAttribute("x2", x);
    line.setAttribute("y1", y1);
    line.setAttribute("y2", y2);
  }

  // Front to back; the skyline starts on the box floor, below every row.
  function drawTerrain() {
    var tilt = shear();
    var sky = new Array(Math.ceil(view.end / SKY_STEP) + 1).fill(view.h);
    for (var i = 0; i < view.layout.lines; i++) {
      var r = row(i, state.offset + i * tilt);
      parts.lines[i].setAttribute("d", visibleD(r, sky));
      lowerSky(sky, r);
      if (!i) trail = r;
    }
    var edge = view.end + view.layout.step;
    var front = parts.lines[0].getAttribute("d");
    parts.fill.setAttribute("d", front + "L" + edge + " " + view.h + "L" + -view.layout.step + " " + view.h + "Z");
    var x = riderX();
    var y = rowY(trail, x);
    parts.rider.setAttribute("cx", x);
    parts.rider.setAttribute("cy", y);
    setLine(parts.stem, x, y, y - 56);
    place(riderLabel, x + 10, y - 60);
  }

  // A service done rides off to the left with the terrain, and is dropped once well past the edge.
  function addMark(kind) {
    var label = element("span", "ridge-label ridge-mark");
    label.innerHTML =
      '<span class="lang-cs">' + MARKS[kind].cs + '</span><span class="lang-en">' + MARKS[kind].en + "</span>";
    var mark = {
      s: state.offset + riderX(),
      dot: svgElement("circle", { r: 3.5, fill: "#0a0a0b", stroke: "#f2f2f1", "stroke-width": 1.5 }),
      stem: svgElement("line", { stroke: "#f2f2f1", "stroke-opacity": 0.35, "stroke-width": 1 }),
      label: label,
    };
    parts.marks.append(mark.stem, mark.dot);
    box.appendChild(label);
    state.marks.push(mark);
  }

  function drawMarks() {
    state.marks = state.marks.filter(function (m) {
      var x = m.s - state.offset;
      if (x < -320) {
        m.dot.remove();
        m.stem.remove();
        m.label.remove();
        return false;
      }
      var y = rowY(trail, x);
      m.dot.setAttribute("cx", x);
      m.dot.setAttribute("cy", y);
      setLine(m.stem, x, y, y - 44);
      place(m.label, x + 10, y - 58);
      return true;
    });
  }

  function number(value, digits) {
    var locale = root.getAttribute("data-lang") === "cs" ? "cs-CZ" : "en-GB";
    return value.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function drawReadings() {
    var cs = root.getAttribute("data-lang") === "cs";
    riderLabel.querySelector("[data-km]").textContent = number(state.km, 1) + " km";
    riderLabel.querySelector("[data-gain]").textContent = "+ " + number(Math.round(state.gain), 0) + " m";
    if (!readout) return;
    ["chain", "brakes"].forEach(function (key) {
      var value = Math.round(state[key]);
      cells[key].querySelector("[data-value]").textContent = value + (cs ? " %" : "%");
      cells[key].querySelector("[data-bar]").style.width = value + "%";
    });
    cells.chain.classList.toggle("is-on", state.climbing);
    cells.brakes.classList.toggle("is-on", !state.climbing);
    var hours = Math.floor(state.fork);
    var minutes = Math.floor((state.fork - hours) * 60);
    cells.fork.querySelector("[data-value]").textContent = hours + ":" + (minutes < 10 ? "0" : "") + minutes + " h";
    cells.fork.querySelector("[data-bar]").style.width = Math.round((state.fork / FORK_SERVICE_H) * 100) + "%";
    cells.fork.classList.toggle("is-on", !state.climbing);
    readout.classList.toggle("is-descent", !state.climbing);
  }

  function draw() {
    drawTerrain();
    drawMarks();
    drawReadings();
  }

  // The rider moves on by dt seconds; whether the ground under them rose decides what wears.
  function advance(dt) {
    var x = riderX();
    var before = height(state.offset + x, x, 0);
    state.offset += view.layout.speed * dt;
    state.time += dt;
    var rise = height(state.offset + x, x, 0) - before;
    var rates = rise >= 0 ? WEAR.climb : WEAR.descent;
    state.climbing = rise >= 0;
    state.km += KM_PER_S * dt;
    state.gain += Math.max(0, rise) * view.layout.mPerPx;
    state.chain = Math.min(100, state.chain + rates.chain * dt);
    state.brakes = Math.min(100, state.brakes + rates.brakes * dt);
    state.fork = Math.min(FORK_SERVICE_H, state.fork + rates.fork * dt);
    state.sinceMark += dt;
    if (state.sinceMark >= MARK_GAP_S) serviceDue();
  }

  // At most one service at a time, the first part found at its limit.
  function serviceDue() {
    var limits = { chain: 100, brakes: 100, fork: FORK_SERVICE_H };
    var due = ["chain", "brakes", "fork"].filter(function (key) {
      return state[key] >= limits[key];
    })[0];
    if (!due) return;
    state[due] = 0;
    state.sinceMark = 0;
    addMark(due);
  }

  // About 25 frames a second is plenty for terrain this slow.
  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (!prev) prev = now;
    if (now - prev < 40) return;
    advance(Math.min((now - prev) / 1000, 0.1));
    prev = now;
    draw();
  }

  function sync() {
    var run = !reduced && inView && !document.hidden;
    if (run && !raf) {
      prev = 0;
      raf = requestAnimationFrame(tick);
    } else if (!run && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  hang();
  build();
  draw();

  if ("ResizeObserver" in window) {
    var resized = new ResizeObserver(function () {
      hang();
      build();
      draw();
    });
    [box, section, title].filter(Boolean).forEach(function (el) {
      resized.observe(el);
    });
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      sync();
    }).observe(section);
  }
  document.addEventListener("visibilitychange", sync);
  new MutationObserver(drawReadings).observe(root, { attributes: true, attributeFilter: ["data-lang"] });
  sync();
}

// The hero and the closing section ride the same terrain, each paused while off screen.
document.querySelectorAll(".ridge").forEach(function (box) {
  ridge(box.closest("section"));
});
