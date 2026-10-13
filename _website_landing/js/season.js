// The service log's season profile, in viewBox units. Once on screen the terrain rolls in from
// the right under "today" and comes to rest; the services ride on it, pinned to their km.
var SEASON = { w: 1280, h: 220, km: 3600, today: 3480, step: 10, ms: 2000 };

function seasonY(s) {
  var n =
    (Math.sin(s * 0.0062 + 2.1) +
      0.6 * Math.sin(s * 0.0151 + 0.4) +
      0.35 * Math.sin(s * 0.029 + 3.3) +
      0.18 * Math.sin(s * 0.061 + 1.1)) /
    2.13;
  return 214 - (34 + 75 * (n + 1));
}

function season(band) {
  var line = band.querySelector("[data-season-line]");
  var fill = band.querySelector("[data-season-fill]");
  var today = band.querySelector("[data-today]");
  var todayKm = today.querySelector("[data-km]");
  var todayX = (SEASON.today / SEASON.km) * SEASON.w;
  var marks = Array.prototype.map.call(band.querySelectorAll("[data-mark-km]"), function (el) {
    return { el: el, s: (Number(el.getAttribute("data-mark-km")) / SEASON.km) * SEASON.w };
  });
  var shift = 0; // how far right of its resting place the terrain still is

  function place(el, x, y) {
    el.style.left = ((x / SEASON.w) * 100).toFixed(2) + "%";
    el.style.top = ((y / SEASON.h) * 100).toFixed(2) + "%";
  }

  // Samples sit on fixed points of the terrain, as in the hero, so the moving line doesn't shimmer.
  function draw() {
    var first = Math.floor(-shift / SEASON.step) * SEASON.step;
    var last = first;
    var d = "";
    for (var s = first; s + shift <= SEASON.w + SEASON.step; s += SEASON.step) {
      d += (s === first ? "M" : "L") + (s + shift).toFixed(1) + " " + seasonY(s).toFixed(1);
      last = s;
    }
    line.setAttribute("d", d);
    fill.setAttribute(
      "d",
      d + "L" + (last + shift).toFixed(1) + " " + SEASON.h + "L" + (first + shift).toFixed(1) + " " + SEASON.h + "Z",
    );
    // A mark fades in over the last 60 units as it comes in past the right edge.
    marks.forEach(function (m) {
      var x = m.s + shift;
      place(m.el, x, seasonY(m.s));
      m.el.style.opacity = Math.max(0, Math.min(1, (SEASON.w - x) / 60));
    });
    place(today, todayX, seasonY(todayX - shift));
    todayKm.textContent = formatReading(((todayX - shift) / SEASON.w) * SEASON.km, "km");
  }

  function play() {
    var start = 0;
    function tick(now) {
      if (!start) start = now;
      var t = Math.min(1, (now - start) / SEASON.ms);
      // Ease in and out: the terrain starts rolling gently instead of jumping off.
      var e = (1 - Math.cos(Math.PI * t)) / 2;
      shift = todayX * (1 - e);
      draw();
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // It starts with the season's first km under "today".
  if (onceInView(band, 0.6, play)) shift = todayX;
  draw();
  new MutationObserver(draw).observe(root, { attributes: true, attributeFilter: ["data-lang"] });
}

season(document.querySelector(".season"));
