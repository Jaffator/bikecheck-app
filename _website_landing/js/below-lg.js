// The reel copies the features switcher's markup, so each title, text and screen is written once.
function element(tag, className) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function phoneOf(screen) {
  var phone = element("div", "phone");
  var body = element("div", "phone-body");
  var display = element("div", "phone-screen");
  var copy = screen.cloneNode(true);
  copy.classList.add("is-on"); // the only screen in this phone, so always the one shown
  body.setAttribute("aria-hidden", "true");
  display.appendChild(copy);
  body.appendChild(display);
  phone.appendChild(body);
  return phone;
}

// Plays one screen through its steps, round and round; paused, it holds its frame.
function player(screen) {
  var steps = stepsOf(screen);
  var at = 0;
  var timer = null;
  function next() {
    at = (at + 1) % steps.length;
    setStep(screen, steps[at]);
    timer = setTimeout(next, steps[at].ms);
  }
  function pause() {
    clearTimeout(timer);
    timer = null;
  }
  return {
    loops: steps.length > 1,
    play: function () {
      if (timer === null && steps.length > 1) timer = setTimeout(next, steps[at].ms);
    },
    pause: pause,
    reset: function () {
      pause();
      at = 0;
      if (steps.length) setStep(screen, steps[0]);
    },
  };
}

// Only the active shot of a block plays, and only while the block is on screen.
// A pause outlives a change of shot; reduced motion starts paused, as the switchers do.
function autoplay(block, shots) {
  var players = shots.map(function (shot) {
    return player(shot.querySelector(".phone-screen > *"));
  });
  var toggle = element("button", "play-toggle");
  var active = 0;
  var paused = reduced;
  var inView = !("IntersectionObserver" in window);

  function sync() {
    block.classList.toggle("is-paused", paused);
    toggle.hidden = !players[active].loops;
    if (paused || !inView) players[active].pause();
    else players[active].play();
  }

  // The switchers' icons and labels; on a round button the labels are for screen readers only.
  toggle.type = "button";
  toggle.innerHTML = document.querySelector(".sw-toggle").innerHTML;
  toggle.querySelectorAll(":scope > span").forEach(function (label) {
    label.classList.add("sr-only");
  });
  toggle.addEventListener("click", function () {
    paused = !paused;
    sync();
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entries) {
        inView = entries[0].isIntersecting;
        sync();
      },
      { rootMargin: "-25% 0px" },
    ).observe(block);
  }
  players.forEach(function (p) {
    p.reset();
  });
  shots[0].appendChild(toggle);
  sync();

  return function activate(index) {
    if (index === active) return;
    players[active].reset();
    active = index;
    players[active].reset();
    shots[active].appendChild(toggle);
    sync();
  };
}

function onScroll(target, fn) {
  var queued = false;
  target.addEventListener(
    "scroll",
    function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        fn();
      });
    },
    { passive: true },
  );
}

// The features as cards swiped sideways; the card snapped to the left edge is the active one.
function reel(wrap) {
  var screens = wrap.querySelectorAll(".sw-phone .phone-screen > *");
  var block = element("div", "reel autoplay");
  var track = element("div", "reel-track");
  var dots = element("div", "reel-dots");
  var cards = [];
  var shots = [];

  wrap.querySelectorAll(".sw-item").forEach(function (item, i) {
    var card = element("article", "reel-card card");
    var title = item.querySelector("h3").cloneNode(true);
    var phone = phoneOf(screens[i]);
    var dot = element("button", "reel-dot");
    title.id = "reel-title-" + i;
    phone.classList.add("shot");
    card.append(title, item.querySelector(".sw-body p").cloneNode(true), phone);
    track.appendChild(card);
    dot.type = "button";
    dot.setAttribute("aria-labelledby", title.id);
    dot.addEventListener("click", function () {
      var left = card.offsetLeft - cards[0].offsetLeft;
      track.scrollTo({ left: left, behavior: reduced ? "auto" : "smooth" });
    });
    dots.appendChild(dot);
    cards.push(card);
    shots.push(phone);
  });
  block.append(track, dots);
  wrap.after(block);

  var activate = autoplay(block, shots);
  function update() {
    var pitch = cards[1].offsetLeft - cards[0].offsetLeft;
    var index = Math.min(Math.max(pitch ? Math.round(track.scrollLeft / pitch) : 0, 0), cards.length - 1);
    Array.prototype.forEach.call(dots.children, function (dot, i) {
      dot.setAttribute("aria-current", String(i === index));
    });
    activate(index);
  }
  onScroll(track, update);
  update();
}

// The step crossing a line 40% down the screen is the lit one. Only a different step
// taking the line moves it on, so a tapped step holds until then.
function followScroll(wrap, sw) {
  var items = wrap.querySelectorAll(".sw-item");
  var belowLg = window.matchMedia("(max-width: 1023px)");
  var at = -1;
  function update() {
    if (!belowLg.matches) return;
    var line = window.innerHeight * 0.4;
    var index = 0;
    items.forEach(function (el, i) {
      if (el.getBoundingClientRect().top <= line) index = i;
    });
    if (index === at) return;
    at = index;
    sw.follow(index);
  }
  belowLg.addEventListener("change", function () {
    at = -1;
    if (belowLg.matches) update();
    else sw.release();
  });
  onScroll(window, update);
  update();
}

// Copied before the switchers start, while their screens still show their first frames.
reel(document.querySelector(".sw-features"));
document.querySelectorAll(".sw").forEach(function (wrap) {
  var sw = switcher(wrap);
  if (wrap.classList.contains("sw-steps")) followScroll(wrap, sw);
});
