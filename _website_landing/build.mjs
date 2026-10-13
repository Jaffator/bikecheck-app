// Lays out dist/, the only folder that is served; Tailwind writes dist/styles.css after this.
import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";

// Every link into the App is written with this address; APP_URL at build points them elsewhere (a local App).
const DEFAULT_APP_URL = "https://app.bikecheck.cloud";
const appUrl = (process.env.APP_URL ?? DEFAULT_APP_URL).replace(/\/+$/, "");

rmSync("dist", { recursive: true, force: true });
cpSync("public", "dist", { recursive: true });
writeFileSync("dist/index.html", readFileSync("index.html", "utf8").replaceAll(DEFAULT_APP_URL, appUrl));
