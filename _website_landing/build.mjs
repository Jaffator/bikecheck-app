// Lays out dist/, the only folder that is served; Tailwind writes dist/styles.css after this.
import { cpSync, rmSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
cpSync("public", "dist", { recursive: true });
cpSync("index.html", "dist/index.html");
