const path = require("path");
const fs = require("fs");
const { chromium } = require("D:/Projects/BikeCheck/_backend/node_modules/playwright");

const BASE = "http://localhost:5177/mock/pro-shots/";
const OUT = "D:/Projects/BikeCheck/Design/pro-screens";

const PHONE = [
  ["01-mobil-garaz-volne-misto", "Main"],
  ["02-mobil-pridat-kolo-menu", "Menu"],
  ["03-mobil-nastaveni-zdarma", "Nastaveni"],
  ["04-mobil-domu-avatar-pro", "Domu"],
  ["05-mobil-nastaveni-pro-obnova", "PNastaveni--obnova"],
  ["06-mobil-nastaveni-pro-zruseno", "PNastaveni--zruseno"],
  ["07-mobil-nastaveni-pro-platba-selhala", "PNastaveni--selhala"],
  ["08-mobil-nastaveni-pro-klic", "PNastaveni--klic"],
  ["09-mobil-spravovat-bezi", "PSprava--bezi"],
  ["10-mobil-spravovat-potvrdit-zruseni", "PSprava--potvrdit"],
  ["11-mobil-spravovat-zruseno", "PSprava--zruseno"],
  ["12-mobil-spravovat-platba-selhala", "PSprava--selhala"],
  ["13-mobil-spravovat-klic", "PSprava--klic"],
  ["14-mobil-garaz-po-skonceni-pro", "Zamcene"],
  ["15-mobil-ai-asistent-na-limitu", "Chat"],
];

const DESKTOP = [
  ["20-desktop-garaz-volne-misto", "D1-Garaz"],
  ["21-desktop-nastaveni-pro-obnova", "D5-Nastaveni--obnova"],
  ["22-desktop-nastaveni-pro-zruseno", "D5-Nastaveni--zruseno"],
  ["23-desktop-nastaveni-pro-platba-selhala", "D5-Nastaveni--selhala"],
  ["24-desktop-nastaveni-pro-klic", "D5-Nastaveni--klic"],
  ["25-desktop-spravovat-bezi", "D6-Sprava--bezi"],
  ["26-desktop-spravovat-potvrdit-zruseni", "D6-Sprava--potvrdit"],
  ["27-desktop-spravovat-zruseno", "D6-Sprava--zruseno"],
  ["28-desktop-spravovat-platba-selhala", "D6-Sprava--selhala"],
  ["29-desktop-spravovat-klic", "D6-Sprava--klic"],
];

async function shoot(page, name, board, full) {
  await page.goto(BASE + board + ".dc.html", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  const file = path.join(OUT, name + ".png");
  await page.screenshot({ path: file, fullPage: full });
  console.log(name);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  for (const [name, board] of PHONE) await shoot(phone, name, board, false);
  const desk = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  for (const [name, board] of DESKTOP) await shoot(desk, name, board, true);
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
