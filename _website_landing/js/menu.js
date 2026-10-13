var menu = document.getElementById("mobile-menu");
var menuToggle = document.getElementById("menu-toggle");
var headerActions = document.getElementById("header-actions");
var menuCloseTimer = null;

function setMenuIcon(open) {
  menuToggle.querySelector('[data-menu-icon="open"]').classList.toggle("hidden", open);
  menuToggle.querySelector('[data-menu-icon="close"]').classList.toggle("hidden", !open);
}

function openMenu() {
  clearTimeout(menuCloseTimer);
  menu.hidden = false;
  // A frame after unhiding, or the fade-in has no start state to run from.
  requestAnimationFrame(function () {
    menu.classList.add("is-open");
  });
  menuToggle.setAttribute("aria-expanded", "true");
  menuToggle.setAttribute("aria-label", root.lang === "cs" ? "Zavřít menu" : "Close menu");
  headerActions.classList.add("invisible");
  root.classList.add("overflow-hidden");
  setMenuIcon(true);
}

function closeMenu() {
  menu.classList.remove("is-open");
  menuCloseTimer = setTimeout(function () {
    menu.hidden = true;
  }, 200);
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Menu");
  headerActions.classList.remove("invisible");
  root.classList.remove("overflow-hidden");
  setMenuIcon(false);
}

function isMenuOpen() {
  return menuToggle.getAttribute("aria-expanded") === "true";
}

menuToggle.addEventListener("click", function () {
  if (isMenuOpen()) closeMenu();
  else openMenu();
});
menu.querySelectorAll("[data-menu-link]").forEach(function (link) {
  link.addEventListener("click", closeMenu);
});
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && isMenuOpen()) {
    closeMenu();
    menuToggle.focus();
  }
});
// From lg up the menu is gone, so an open one must not leave the page scroll-locked.
window.matchMedia("(min-width: 1024px)").addEventListener("change", function (e) {
  if (e.matches && isMenuOpen()) closeMenu();
});
