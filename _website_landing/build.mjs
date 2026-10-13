// Lays out dist/, the only folder that is served; Tailwind writes dist/styles.css after this.
import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";

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

// Caddy sends no cache headers, so new HTML must not meet an old script or stylesheet.
const CACHE_BUSTED = ["styles.css", "head.js", "main.js"];

function bundle() {
  const body = SCRIPTS.map((name) => readFileSync(`js/${name}.js`, "utf8")).join("\n");
  return `(function () {\n"use strict";\n\n${body}})();\n`;
}

function withVersion(html) {
  return CACHE_BUSTED.reduce((page, file) => {
    if (!page.includes(`="${file}"`)) throw new Error(`build: no ="${file}" in index.html to version`);
    return page.replace(`="${file}"`, `="${file}?v=${version}"`);
  }, html);
}

rmSync("dist", { recursive: true, force: true });
cpSync("public", "dist", { recursive: true });
cpSync("js/head.js", "dist/head.js");
writeFileSync("dist/main.js", bundle());
writeFileSync(
  "dist/index.html",
  withVersion(readFileSync("index.html", "utf8"))
    .replaceAll(DEFAULT_APP_URL, appUrl)
    .replace("</head>", tracker)
    .replace("<!-- version -->", ` · v${version}`),
);
