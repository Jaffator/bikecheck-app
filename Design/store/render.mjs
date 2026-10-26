// Renders the Play Store assets through headless Chrome over CDP, no npm deps.
// node render.mjs            -> feature graphic + 8 screenshots, cs and en, into out/
// node render.mjs feature    -> feature graphic only
// node render.mjs screens    -> screenshots only
// node render.mjs screens 8  -> one slide
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const port = 9344;
const profile = join(tmpdir(), "bikecheck-store-render");
const langs = ["cs", "en"];
const what = process.argv[2] ?? "all";
const only = Number(process.argv[3]) || null;

mkdirSync(join(dir, "out"), { recursive: true });
for (const lang of langs) mkdirSync(join(dir, "out", "screenshots", lang), { recursive: true });

const proc = spawn(chrome, [
  "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  "--no-first-run", "--hide-scrollbars", "--disable-gpu", "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 40 && !target; i++) {
  await sleep(250);
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    target = list.find((t) => t.type === "page");
  } catch {}
}
if (!target) { proc.kill(); throw new Error("chrome did not start"); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
const send = (method, params = {}) =>
  new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });

const READY = "document.fonts.status === 'loaded' && document.fonts.check('700 70px Roboto') && [...document.images].filter((i) => i.src).every((i) => i.complete && i.naturalWidth > 0)";
// two frames after ready, so heavy filters are composited before the capture
const PAINTED = "new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))";

async function shoot(file, query, width, height, out) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: pathToFileURL(join(dir, file)).href + query });
  await sleep(400);
  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) {
    const r = await send("Runtime.evaluate", { expression: READY, returnByValue: true });
    ready = Boolean(r.result?.result?.value);
    if (!ready) await sleep(250);
  }
  if (!ready) console.warn("not ready after 15 s:", file + query);
  await send("Runtime.evaluate", { expression: PAINTED, awaitPromise: true });
  await sleep(300);
  const shot = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width, height, scale: 1 } });
  writeFileSync(join(dir, "out", out), Buffer.from(shot.result.data, "base64"));
  console.log("wrote out/" + out);
}

if (what === "all" || what === "feature") {
  for (const lang of langs) await shoot("feature-graphic.html", `?lang=${lang}`, 1024, 500, `feature-graphic-${lang}.png`);
}
if (what === "all" || what === "screens") {
  for (const lang of langs) {
    for (let n = 1; n <= 8; n++) {
      if (only && n !== only) continue;
      // English files carry the language so both sets can sit in one Play Console upload folder
      const suffix = lang === "en" ? "-en" : "";
      await shoot("screenshots.html", `?lang=${lang}&slide=${n}`, 1080, 1920, `screenshots/${lang}/0${n}${suffix}.png`);
    }
  }
}

ws.close();
proc.kill();
