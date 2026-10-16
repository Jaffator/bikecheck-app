var root = document.documentElement;
// The build writes one page per language (/ and /en/), so the language never changes in place.
var lang = root.getAttribute("data-lang");

document.querySelectorAll(".lang-btn").forEach(function (link) {
  var on = link.dataset.setLang === lang;
  if (on) link.setAttribute("aria-current", "page");
  link.classList.toggle("bg-gold-500", on);
  link.classList.toggle("text-ink-950", on);
  link.classList.toggle("text-paper-dim", !on);
});

// A placeholder is an attribute, so the .lang-* spans can't switch it.
document.querySelectorAll("[data-placeholder-cs]").forEach(function (field) {
  field.placeholder = lang === "cs" ? field.dataset.placeholderCs : field.dataset.placeholderEn;
});

// Offered, never redirected: an en-US crawler must still get the Czech page on /.
if (lang === "cs" && (navigator.language || "").split("-")[0] !== "cs") {
  document.querySelectorAll("[data-prefer-en]").forEach(function (link) {
    link.hidden = false;
  });
}
