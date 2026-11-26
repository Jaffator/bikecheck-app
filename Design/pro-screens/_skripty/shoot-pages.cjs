// Phone screenshots of Rides (and one opened ride), Riders and Settings in the real app, with sample data.
const fs = require("fs");
const { chromium } = require("D:/Projects/BikeCheck/_backend/node_modules/playwright");
const fx = require("./fixtures.cjs");

const OUT = "D:/Projects/BikeCheck/Design/pro-screens/app-stranky-mobil";
const PHOTO = "D:/Projects/BikeCheck_website/assets/img_ready/rallon.webp";

async function mock(page, lang, log) {
  await page.route("**/__shot/**", (r) => r.fulfill({ body: fs.readFileSync(PHOTO), contentType: "image/webp" }));
  await page.route((url) => url.pathname.startsWith("/api/"), (r) => {
    const u = new URL(r.request().url());
    const path = u.pathname.replace(/^\/api/, "");
    const key = path + u.search;
    let body = key === "/auth/me" ? { ...fx.user, language: lang } : fx.exact[key] ?? fx.exact[path];
    if (body === undefined) {
      body = r.request().method() === "GET" ? fx.guess(key) : {};
      if (!key.startsWith("/rides?")) log.push(r.request().method() + " " + key);
    }
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

// The page scrolls in the window or in the app shell's main; scroll whichever has room.
async function scrollBy(page, dy) {
  await page.evaluate((d) => {
    const scrollable = (el) => el.scrollHeight > el.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(el).overflowY);
    const dialog = document.querySelector("[role=dialog]");
    const inDialog = dialog ? [...dialog.querySelectorAll("*")].find(scrollable) : null;
    (inDialog ?? document.scrollingElement).scrollBy(0, d);
  }, dy);
}

async function run(browser, lang) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true });
  const log = [];
  page.on("pageerror", (e) => log.push("pageerror " + e.message.slice(0, 150)));
  await mock(page, lang, log);
  await page.addInitScript((l) => localStorage.setItem("i18nextLng", l), lang);
  const shot = async (n, wait = 900) => {
    await page.waitForTimeout(wait);
    await page.screenshot({ path: `${OUT}/${n}-${lang}.png` });
  };
  const go = async (p) => {
    await page.goto(`http://localhost:5190${p}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
  };

  await go("/rides");
  await shot("01-jizdy", 0);
  await scrollBy(page, 600);
  await shot("02-jizdy-dole", 500);
  await scrollBy(page, -2000);
  await page.waitForTimeout(400);
  // The card itself, away from its Strava link.
  const card = page.getByText(/24\. ?11\. ?2026|11\/24\/2026|24\/11\/2026|Nov 24/).first();
  await card.click();
  await shot("03-jizda-detail", 1200);
  await scrollBy(page, 700);
  await shot("04-jizda-detail-dole", 600);

  await go("/follows");
  await shot("05-jezdci-sledovani", 0);
  await page.getByRole("tab").nth(1).click();
  await shot("06-jezdci-sledujici", 700);

  await go("/settings");
  await shot("07-nastaveni", 0);
  await scrollBy(page, 2000);
  await shot("08-nastaveni-dole", 500);

  await go("/settings");
  await page.getByText(/^(Nastavení sdílení|Sharing settings|Sharing)$/).first().click();
  await shot("09-nastaveni-sdileni", 1200);

  await go("/service");
  await shot("10-servis-pozornost", 0);
  // The attention card's rows, worst first.
  const rows = page.locator("div[role=button]").filter({ hasText: "Orbea Rallon" });
  // The first row is the Planned card's (the fork); the overdue chain comes next.
  await rows.nth(1).click();
  await shot("11-pozornost-drawer-po-terminu", 1200);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(700);
  await rows.first().click();
  await shot("12-pozornost-drawer-naplanovano", 1200);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(700);

  await scrollBy(page, 1500);
  await page.waitForTimeout(400);
  await page.getByText(/3\s?890/).first().click();
  await shot("13-servis-detail", 1200);
  await scrollBy(page, 700);
  await shot("14-servis-detail-dole", 600);

  await go("/service/history");
  await shot("15-servis-historie", 0);

  console.log(lang, log.length ? [...new Set(log)].join(" | ") : "ok");
  await page.close();
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const lang of ["cs", "en"]) {
    try { await run(browser, lang); } catch (e) { console.log(lang, "FAILED", e.message.split("\n")[0]); }
  }
  await browser.close();
})();
