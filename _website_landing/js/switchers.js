// One phone and the switches around it (see "Switchers" in the styles). A
// block plays through its screens by itself while it is on screen and no
// mouse is resting on a switch or the phone. A screen made of several
// frames (.phone-frames) is played through step by step first, and goes
// round on its own for as long as a resting mouse keeps the block on it.
// A pick jumps to that screen and the play-through carries on from
// there; the button stops everything, or starts it again.
var SWITCH_MS = 4500;
var FRAME_MS = 2000;
var FIRST_MS = 800; // a screen's first frame: it has just come on, so it moves soon
var SCROLL_MS = 1800; // a step that scrolls: the slide (0.25s delay + 1.4s), then a short look

// The steps a screen is played through in: its frames in order, a frame
// that scrolls (data-stops) once for each of its stops. It starts from
// its top, so a stop of 0% is a step that only shows it.
function stepsOf(screen) {
  var steps = [];
  if (!screen.classList.contains("phone-frames")) return steps;
  // A long stack of shots may set its own, quicker pace.
  var frameMs = Number(screen.getAttribute("data-frame-ms")) || FRAME_MS;
  Array.prototype.forEach.call(screen.children, function (el) {
    var at = "0%";
    (el.getAttribute("data-stops") || at).split(" ").forEach(function (y) {
      steps.push({ el: el, y: y, ms: y === at ? frameMs : SCROLL_MS });
      at = y;
    });
  });
  if (steps.length > 1) steps[0].ms = FIRST_MS;
  return steps;
}

function setStep(screen, step) {
  Array.prototype.forEach.call(screen.children, function (el) {
    el.classList.toggle("is-on", el === step.el);
    if (el.hasAttribute("data-stops")) el.style.setProperty("--y", el === step.el ? step.y : "0%");
  });
}

// Where in a screen's play-through its step begins, in ms.
function startOf(steps, index) {
  return steps.slice(0, index).reduce(function (sum, step) {
    return sum + step.ms;
  }, 0);
}

// A switch's fill (.steps-fill) grows over its screen's whole play-through, from empty.
function fillOf(item, steps) {
  var el = item.querySelector(".steps-fill");
  if (!el || !el.animate || steps.length < 2) return null;
  var anim = el.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], {
    duration: startOf(steps, steps.length),
    iterations: Infinity,
  });
  anim.pause();
  anim.currentTime = 0;
  return anim;
}

function switcher(wrap) {
  var items = Array.prototype.slice.call(wrap.querySelectorAll(".sw-item"));
  var phones = Array.prototype.slice.call(wrap.querySelectorAll(".sw-phone"));
  var screens = wrap.querySelectorAll(".sw-phone .phone-screen > *");
  var steps = Array.prototype.map.call(screens, stepsOf);
  var fills = items.map(function (el, i) {
    return fillOf(el, steps[i]);
  });
  var toggle = wrap.querySelector(".sw-toggle");
  var current = 0;
  var frames = [];
  var frame = 0;
  var timer = null;
  // moving: the block changes by itself at all; auto: it also moves on
  // from one switch to the next.
  var moving = false;
  var auto = false;
  // The scroll picks the switch instead, so the clock only plays its frames.
  var followsScroll = false;
  // A browser with nothing to watch the block with plays it regardless.
  var inView = !("IntersectionObserver" in window);
  var hovered = false;

  function showFrame(index) {
    frame = index;
    if (frames[index]) setStep(screens[current], frames[index]);
  }

  function show(index) {
    showFrame(0); // the screen being left starts over the next time
    current = index;
    frames = steps[index];
    showFrame(0);
    items.forEach(function (el, i) {
      el.classList.toggle("is-on", i === index);
      el.setAttribute("aria-pressed", String(i === index));
    });
    screens.forEach(function (screen, i) {
      screen.classList.toggle("is-on", i === index);
    });
  }

  // Only the playing switch's fill runs, re-synced to its frame; a held one stops where it is.
  function syncFills(running) {
    fills.forEach(function (anim, i) {
      if (!anim) return;
      if (i === current && running) {
        anim.currentTime = startOf(frames, frame);
        anim.play();
        return;
      }
      anim.pause();
      if (i !== current) anim.currentTime = 0;
    });
  }

  function play() {
    clearTimeout(timer);
    var loops = frames.length > 1;
    var movesOn = auto && !hovered && !followsScroll;
    var running = moving && inView && (loops || movesOn);
    // .is-auto is what the button goes by: something here is changing.
    wrap.classList.toggle("is-auto", moving && (auto || loops));
    syncFills(running);
    if (!running) return;
    timer = setTimeout(
      function () {
        if (frame < frames.length - 1) showFrame(frame + 1);
        else if (movesOn) show((current + 1) % items.length);
        else showFrame(0);
        play();
      },
      loops ? frames[frame].ms : SWITCH_MS,
    );
  }

  // A switch only becomes a button here, so that without a script it stays
  // the plain heading and text it is in the markup.
  items.forEach(function (el, i) {
    // A pick also starts a block that was paused. Only where less motion
    // is asked for does a block that stands still stay that way.
    function pick() {
      show(i);
      moving = auto = moving || !reduced;
      play();
    }
    el.setAttribute("role", "button");
    el.tabIndex = 0;
    el.addEventListener("click", pick);
    el.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      pick();
    });
  });

  toggle.addEventListener("click", function () {
    moving = auto = !wrap.classList.contains("is-auto");
    play();
  });

  // A mouse resting on a switch or the phone holds the play-through; the
  // button is left out on purpose, so pressing Play is seen to start it.
  // Touch is left out too: a finger never leaves, and one tap on the phone
  // would hold the block for good. A phone inside its switch is covered by the switch.
  var held = phones.filter(function (phone) {
    return !phone.closest(".sw-item");
  });
  items.concat(held).forEach(function (el) {
    el.addEventListener("pointerenter", function (e) {
      if (e.pointerType !== "mouse") return;
      hovered = true;
      play();
    });
    el.addEventListener("pointerleave", function (e) {
      if (e.pointerType !== "mouse") return;
      hovered = false;
      play();
    });
  });

  // It is the phones that are watched, not the block: with the switches
  // stacked under it the block can be several windows tall, and what
  // changes is a phone. Below lg the steps' phones stack, so any one in view counts.
  if ("IntersectionObserver" in window) {
    var seen = new Set();
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) seen.add(entry.target);
          else seen.delete(entry.target);
        });
        inView = seen.size > 0;
        play();
      },
      { threshold: 0.35 },
    );
    phones.forEach(function (phone) {
      io.observe(phone);
    });
  }

  show(0);
  moving = auto = !reduced;
  play();

  // For below-lg.js: a switch the scroll picks starts over, but a paused block stays paused.
  return {
    follow: function (index) {
      followsScroll = true;
      if (index !== current) show(index);
      play();
    },
    release: function () {
      followsScroll = false;
      play();
    },
  };
}
