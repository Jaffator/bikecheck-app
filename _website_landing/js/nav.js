// The section crossing a thin band 40% down the window lights its header link; the log sits under Service.
var navLinks = document.querySelectorAll('header a[href^="#"]');
var NAV_FOR = { "service-log": "wear" };

function markNav(id) {
  navLinks.forEach(function (link) {
    var on = link.getAttribute("href") === "#" + id;
    link.classList.toggle("text-paper", on);
    if (on) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}

if ("IntersectionObserver" in window) {
  var navSeen = new Set();
  var navIo = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) navSeen.add(entry.target.id);
        else navSeen.delete(entry.target.id);
      });
      var id = Array.from(navSeen)[0];
      markNav(id ? NAV_FOR[id] || id : null);
    },
    { rootMargin: "-40% 0px -59% 0px" },
  );
  document.querySelectorAll("main section[id]").forEach(function (section) {
    navIo.observe(section);
  });
}
