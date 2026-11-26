// Screenshots of the real app's Pro sheet over the real garage, on a phone, with sample data.
const fs = require("fs");
const { chromium } = require("D:/Projects/BikeCheck/_backend/node_modules/playwright");
const fx = require("./fixtures.cjs");

const OUT = "D:/Projects/BikeCheck/Design/pro-screens/app-sheet-mobil";
const PHOTO = "D:/Projects/BikeCheck_website/assets/img_ready/rallon.webp";
const VARIANTS = [
  ["web-zaplaceno", 5190, "pay"],
  ["web-platba-selhala", 5191, "pay"],
  ["android-zaplaceno", 5192, "pay"],
  ["android-platba-selhala", 5193, "pay"],
  ["klic", 5190, "key"],
  ["produkce", 5194, "prod"],
];

async function mock(page, lang, log) {
  await page.route("**/__shot/**", (r) => r.fulfill({ body: fs.readFileSync(PHOTO), contentType: "image/webp" }));
  await page.route((url) => url.pathname.startsWith("/api/"), async (r) => {
    const u = new URL(r.request().url());
    const path = u.pathname.replace(/^\/api/, "");
    const key = path + u.search;
    if (path === "/billing/redeem-key") {
      const code = JSON.parse(r.request().postData() ?? "{}").code ?? "";
      await new Promise((res) => setTimeout(res, 900));
      if (code.trim().toLowerCase() !== "jarda-pro") {
        return r.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ statusCode: 404, message: "KEY_NOT_VALID" }) });
      }
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...fx.bikeLimit, pro_since: new Date().toISOString() }) });
    }
    let body = key === "/auth/me" ? { ...fx.user, language: lang } : fx.exact[key] ?? fx.exact[path];
    if (body === undefined) {
      log.push(r.request().method() + " " + key);
      body = r.request().method() === "GET" ? fx.guess(key) : {};
    }
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

async function openSheet(page) {
  await page.getByRole("button", { name: /^(Přidat|Add|Create|Vytvořit)/ }).last().click();
  await page.waitForTimeout(500);
  await page.getByRole("menuitem").first().click();
  await page.locator(".pro-sheet").waitFor();
  await page.waitForTimeout(900);
}

async function run(browser, [name, port, flow], lang) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true });
  const log = [];
  page.on("pageerror", (e) => log.push("pageerror " + e.message));
  await mock(page, lang, log);
  await page.addInitScript((l) => localStorage.setItem("i18nextLng", l), lang);
  await page.goto(`http://localhost:${port}/bikes`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const tag = `${name}-${lang}`;
  const shot = async (n, wait = 900) => {
    await page.waitForTimeout(wait);
    await page.screenshot({ path: `${OUT}/${tag}-${n}.png` });
  };
  const step = () => page.locator(".pro-sheet__step button");
  await shot("0-garaz", 0);
  await openSheet(page);
  await shot("1-nabidka", 0);

  if (flow === "prod" || flow === "key") {
    await step().filter({ hasText: /klíč|key/i }).first().click();
    await shot("2-klic");
    if (flow === "key") {
      await page.keyboard.type("spatny-klic");
      await step().first().click();
      await shot("3-overuji", 300);
      await shot("4-neplatny", 1300);
      await page.keyboard.press("Control+A");
      await page.keyboard.type("JARDA-PRO");
      await step().first().click();
      await shot("5-odemceno", 2300);
    }
  } else {
    await step().first().click();
    await shot("2-souhrn");
    const box = page.locator(".pro-consent input");
    if (await box.count()) {
      await page.locator(".pro-consent").click({ position: { x: 20, y: 20 } });
      await shot("3-souhlas", 300);
    }
    await step().last().click();
    await shot("4-platim", 700);
    if (name.includes("selhala")) await shot("5-selhala", 1700);
    await shot("6-vysledek", 2000);
  }
  if (log.length) console.log(tag, [...new Set(log)].join(" | "));
  console.log(tag, "ok");
  await page.close();
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const v of VARIANTS) for (const lang of ["cs", "en"]) {
    try { await run(browser, v, lang); } catch (e) { console.log(v[0], lang, "FAILED", e.message.split("\n")[0]); }
  }
  await browser.close();
})();
