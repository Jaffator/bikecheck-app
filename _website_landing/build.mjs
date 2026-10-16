// Lays out dist/, the only folder that is served; Tailwind writes dist/styles.css after this.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

// Every link into the App is written with this address; APP_URL at build points them elsewhere (a local App).
const DEFAULT_APP_URL = "https://app.bikecheck.cloud";
const appUrl = (process.env.APP_URL ?? DEFAULT_APP_URL).replace(/\/+$/, "");

// Only a build given all three gets the Umami tracker, so local builds never count a visit.
const { UMAMI_WEBSITE_ID, STATS_HOST, TRACKER_SCRIPT_NAME } = process.env;
const tracker =
  UMAMI_WEBSITE_ID && STATS_HOST && TRACKER_SCRIPT_NAME
    ? `<script defer src="https://${STATS_HOST}/${TRACKER_SCRIPT_NAME}" data-website-id="${UMAMI_WEBSITE_ID}" data-host-url="https://${STATS_HOST}"></script>\n  </head>`
    : "</head>";

// The release script bumps package.json, so the footer names the deployed tag.
const { version } = JSON.parse(readFileSync("package.json", "utf8"));

// In page order. The files use each other's names (root, reduced, element(), helpers), so they share one IIFE.
const SCRIPTS = ["lang", "menu", "nav", "year", "reveal", "ridge", "wear", "season", "switchers", "below-lg", "contact-form"];

// One page per language, so a crawler gets each in its own head (#253). Crawlers need absolute addresses.
const SITE_URL = "https://bikecheck.cloud";
const PAGES = [
  {
    lang: "cs",
    file: "dist/index.html",
    url: `${SITE_URL}/`,
    locale: "cs_CZ",
    title: "BikeCheck: Vše o tvém kole na jednom místě",
    description:
      "Servisní deník pro cyklisty. Propoj Stravu a nájezd z každé jízdy se sám rozpustí do opotřebení řetězu, brzd i odpružení.",
    ogDescription:
      "Strava počítá tvoje kilometry, BikeCheck ty na dílech. Servisní intervaly, historie každého kusu a reporty ke sdílení.",
  },
  {
    lang: "en",
    file: "dist/en/index.html",
    url: `${SITE_URL}/en/`,
    locale: "en_US",
    title: "BikeCheck: Everything about your bike in one place",
    description:
      "A service log for cyclists. Connect Strava and the distance of every ride turns into wear on your chain, brakes and suspension.",
    ogDescription:
      "Strava counts your kilometres, BikeCheck counts them on your parts. Service intervals, the history of every part and reports to share.",
  },
];

// Caddy sends no cache headers, so new HTML must not meet an old script or stylesheet.
const CACHE_BUSTED = ["styles.css", "head.js", "main.js"];

function bundle() {
  const body = SCRIPTS.map((name) => readFileSync(`js/${name}.js`, "utf8")).join("\n");
  return `(function () {\n"use strict";\n\n${body}})();\n`;
}

function replaceOnce(html, from, to) {
  if (!html.includes(from)) throw new Error(`build: no ${from} in index.html`);
  return html.replace(from, to);
}

function metaTags(page) {
  const other = PAGES.find((p) => p !== page);
  return `<title>${page.title}</title>
    <meta name="description" content="${page.description}" />
    <link rel="canonical" href="${page.url}" />
    <link rel="alternate" hreflang="cs" href="${SITE_URL}/" />
    <link rel="alternate" hreflang="en" href="${SITE_URL}/en/" />
    <link rel="alternate" hreflang="x-default" href="${SITE_URL}/" />
    <meta property="og:site_name" content="BikeCheck" />
    <meta property="og:locale" content="${page.locale}" />
    <meta property="og:locale:alternate" content="${other.locale}" />
    <meta property="og:title" content="${page.title}" />
    <meta property="og:description" content="${page.ogDescription}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${page.url}" />
    <meta property="og:image" content="${SITE_URL}/og-image.jpg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="BikeCheck" />
    <meta name="twitter:card" content="summary_large_image" />`;
}

// The source is the Czech page; English swaps the root language and hands lang=en to the App links (ADR 0041).
function forLanguage(html, page) {
  const localized = replaceOnce(
    replaceOnce(html, '<html lang="cs" data-lang="cs">', `<html lang="${page.lang}" data-lang="${page.lang}">`),
    "<!-- meta: title, description, canonical, hreflang and og:* per language, written by build.mjs -->",
    metaTags(page),
  );
  return page.lang === "en" ? localized.replaceAll("lang=cs", "lang=en") : localized;
}

function withVersion(html) {
  return CACHE_BUSTED.reduce((page, file) => {
    if (!page.includes(`="/${file}"`)) throw new Error(`build: no ="/${file}" in index.html to version`);
    return page.replace(`="/${file}"`, `="/${file}?v=${version}"`);
  }, html);
}

rmSync("dist", { recursive: true, force: true });
cpSync("public", "dist", { recursive: true });
cpSync("js/head.js", "dist/head.js");
writeFileSync("dist/main.js", bundle());
const source = withVersion(readFileSync("index.html", "utf8"))
  .replaceAll(DEFAULT_APP_URL, appUrl)
  .replace("</head>", tracker)
  .replace("<!-- version -->", ` · v${version}`);
mkdirSync("dist/en", { recursive: true });
PAGES.forEach((page) => writeFileSync(page.file, forLanguage(source, page)));
