// Lays out dist/, the only folder that is served; Tailwind writes dist/styles.css after this.
import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";

// Every link into the App is written with this address; APP_URL at build points them elsewhere (a local App).
const DEFAULT_APP_URL = "https://app.bikecheck.cloud";
const appUrl = (process.env.APP_URL ?? DEFAULT_APP_URL).replace(/\/+$/, "");

// Only a build given both gets the Umami tracker, so local builds never count a visit.
const { UMAMI_WEBSITE_ID, STATS_HOST } = process.env;
const tracker =
  UMAMI_WEBSITE_ID && STATS_HOST
    ? `<script defer src="https://${STATS_HOST}/script.js" data-website-id="${UMAMI_WEBSITE_ID}"></script>\n  </head>`
    : "</head>";

rmSync("dist", { recursive: true, force: true });
cpSync("public", "dist", { recursive: true });
writeFileSync(
  "dist/index.html",
  readFileSync("index.html", "utf8").replaceAll(DEFAULT_APP_URL, appUrl).replace("</head>", tracker),
);
