// Marks the document as script-enabled before first paint, so the reveal
// animation only ever hides content that JS is able to reveal again.
document.documentElement.classList.add("js");

// Language before first paint, so no Czech copy flashes for an English browser.
// A saved CS/EN pick wins; otherwise the browser's, cs or en, as the App's detectLanguage().
(function () {
  var lang = null;
  try {
    lang = localStorage.getItem("bikecheck-lang");
  } catch (e) {}
  if (lang !== "cs" && lang !== "en") {
    lang = (navigator.language || "").split("-")[0] === "cs" ? "cs" : "en";
  }
  document.documentElement.setAttribute("data-lang", lang);
  document.documentElement.setAttribute("lang", lang);
})();
