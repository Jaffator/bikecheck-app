var root = document.documentElement;
var STORE_KEY = "bikecheck-lang";

function applyLang(lang) {
  root.setAttribute("data-lang", lang);
  root.setAttribute("lang", lang);
  document.querySelectorAll(".lang-btn").forEach(function (btn) {
    var on = btn.dataset.setLang === lang;
    btn.setAttribute("aria-pressed", String(on));
    btn.classList.toggle("bg-gold-500", on);
    btn.classList.toggle("text-ink-950", on);
    btn.classList.toggle("text-paper-dim", !on);
  });
  // A placeholder is an attribute, so the .lang-* spans can't switch it.
  document.querySelectorAll("[data-placeholder-cs]").forEach(function (field) {
    field.placeholder = lang === "cs" ? field.dataset.placeholderCs : field.dataset.placeholderEn;
  });
  // Links into the App hand the language over, so it opens in the one shown (ADR 0041).
  document.querySelectorAll("a[data-app-link]").forEach(function (link) {
    var url = new URL(link.href);
    url.searchParams.set("lang", lang);
    link.href = url.toString();
  });
}

// The <head> script picked the language; only a click is saved, so a detected one keeps following the browser.
applyLang(root.getAttribute("data-lang"));

document.querySelectorAll(".lang-btn").forEach(function (btn) {
  btn.addEventListener("click", function () {
    applyLang(btn.dataset.setLang);
    try {
      localStorage.setItem(STORE_KEY, btn.dataset.setLang);
    } catch (e) {}
  });
});
