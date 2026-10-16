// Gradle's bundleRelease on any OS, then where the signed AAB landed (docs/deploy.md, Android release).
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const windows = process.platform === "win32";
const androidDir = fileURLToPath(new URL("../android/", import.meta.url));
// Absolute: cmd may be set not to look in the current directory.
const gradlew = fileURLToPath(new URL(`../android/${windows ? "gradlew.bat" : "gradlew"}`, import.meta.url));
const aab = fileURLToPath(new URL("../android/app/build/outputs/bundle/release/app-release.aab", import.meta.url));

// Node spawns a .bat only through a shell, which needs the path quoted.
const result = spawnSync(windows ? `"${gradlew}"` : gradlew, ["bundleRelease"], {
  cwd: androidDir,
  stdio: "inherit",
  shell: windows,
});
if (result.status !== 0) process.exit(result.status ?? 1);

console.log(`\nSigned AAB: ${aab}`);
