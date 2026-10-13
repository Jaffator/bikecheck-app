var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// The hero's facts strip lights up the same way, but only below lg (see .facts in the styles).
var revealables = document.querySelectorAll(".reveal, .facts");

if (reduced || !("IntersectionObserver" in window)) {
  revealables.forEach(function (el) {
    el.classList.add("in");
  });
} else {
  // Below lg a block stays grey while it only peeks in at the bottom, and lights up
  // once its top has climbed past the lower third of the screen.
  var revealMargin = window.matchMedia("(min-width: 1024px)").matches ? "-12%" : "-32%";
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px " + revealMargin + " 0px", threshold: 0.04 },
  );
  revealables.forEach(function (el) {
    io.observe(el);
  });
}
