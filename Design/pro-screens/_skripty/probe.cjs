const fs = require("fs");
const { chromium } = require("D:/Projects/BikeCheck/_backend/node_modules/playwright");
const fx = require("./fixtures.cjs");

const APP = "http://localhost:5190";
const PHOTO = "D:/Projects/BikeCheck_website/assets/img_ready/rallon.webp";

async function mock(page, log) {
  await page.route("**/__shot/**", (r) => r.fulfill({ body: fs.readFileSync(PHOTO), contentType: "image/webp" }));
  await page.route((url) => url.pathname.startsWith("/api/"), (r) => {
    const u = new URL(r.request().url());
    const key = u.pathname.replace(/^\/api/, "") + u.search;
    const method = r.request().method();
    let body = fx.exact[key] ?? fx.exact[u.pathname.replace(/^\/api/, "")];
    const known = body !== undefined;
    if (!known) body = method === "GET" ? fx.guess(key) : {};
    log.push(`${known ? "  " : "??"} ${method} ${key}`);
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

(async () => {
  const [w, h, path, out] = [Number(process.argv[2] ?? 390), Number(process.argv[3] ?? 844), process.argv[4] ?? "/bikes", process.argv[5]];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const log = [];
  page.on("console", (m) => m.type() === "error" && log.push("console: " + m.text().slice(0, 600)));
  page.on("pageerror", (e) => log.push("pageerror: " + (e.stack || e.message).split("\n").slice(0, 8).join("\n")));
  await mock(page, log);
  await page.goto(APP + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  if (out) await page.screenshot({ path: out });
  console.log(page.url());
  console.log([...new Set(log)].join("\n"));
  await browser.close();
})();
