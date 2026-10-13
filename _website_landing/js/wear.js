// Once on screen the bars fill top-down, each reading counting up with its bar. Played once.
var WEAR_MS = 900;
var WEAR_STAGGER_MS = 80;

function easeOut(t) {
  return 1 - Math.pow(1 - t, 1.8);
}

// Hours arrive as minutes, so a reading always lands on the minute it shows.
function formatReading(value, unit) {
  var cs = root.getAttribute("data-lang") === "cs";
  var n = Math.round(value);
  if (unit === "h") return Math.floor(n / 60) + ":" + (n % 60 < 10 ? "0" : "") + (n % 60) + " h";
  if (unit === "%") return n + (cs ? " %" : "%");
  return n.toLocaleString(cs ? "cs-CZ" : "en-GB") + " " + unit;
}

// Starts fn the first time el is well into the window; without the observer, or with reduced motion, never.
function onceInView(el, threshold, fn) {
  if (reduced || !("IntersectionObserver" in window)) return false;
  var io = new IntersectionObserver(
    function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      fn();
    },
    { rootMargin: "0px 0px -12% 0px", threshold: threshold },
  );
  io.observe(el);
  return true;
}

function wear(list) {
  var rows = Array.prototype.map.call(list.querySelectorAll(".wear-row"), function (row) {
    var reading = row.querySelector("[data-to]");
    return {
      fill: row.querySelector(".wear-fill"),
      reading: reading,
      to: Number(reading.getAttribute("data-to")),
      unit: reading.getAttribute("data-unit"),
      p: 1,
    };
  });

  function draw() {
    rows.forEach(function (r) {
      r.fill.style.transform = "scaleX(" + r.p + ")";
      r.reading.textContent = formatReading(r.to * r.p, r.unit);
    });
  }

  function play() {
    var start = 0;
    function tick(now) {
      if (!start) start = now;
      var done = true;
      rows.forEach(function (r, i) {
        var t = Math.min(1, Math.max(0, (now - start - i * WEAR_STAGGER_MS) / WEAR_MS));
        r.p = easeOut(t);
        if (t < 1) done = false;
      });
      draw();
      if (!done) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if (onceInView(list, 0.25, play)) {
    rows.forEach(function (r) {
      r.p = 0;
    });
  }
  draw();
  new MutationObserver(draw).observe(root, { attributes: true, attributeFilter: ["data-lang"] });
}

wear(document.querySelector(".wear-list"));
