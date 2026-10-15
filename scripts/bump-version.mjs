// `npm run version:bump`: commits the next version into the App's and the Website's package files,
// on the current branch, for a PR to main; `npm run deploy:production` then tags it (docs/deploy.md).
import { CANCELLED, VERSION_FILES, gitOk, highestTag, paint, pickVersion, run, stop, writeVersion } from "./release.mjs";

async function checkPreconditions() {
  // The bump commit must hold the version and nothing else.
  if (await run("git", ["status", "--porcelain", "--", ...VERSION_FILES])) stop("Package files have uncommitted changes; commit or stash them first.");
  if (!(await gitOk(["fetch", "--tags"]))) stop("git fetch --tags failed.");
}

async function main() {
  await checkPreconditions();
  const lastTag = highestTag((await run("git", ["tag", "--list", "v*"])).split(/\r?\n/));
  const version = await pickVersion(lastTag);
  if (version === null) {
    console.log(CANCELLED);
    return;
  }
  if ((await writeVersion(version.slice(1))) === 0) {
    console.log(`Already on ${version}; nothing to commit.`);
    return;
  }
  await run("git", ["add", ...VERSION_FILES]);
  await run("git", ["commit", "-m", `chore(release): ${version}`]);
  console.log(paint("green", `✔ chore(release): ${version} committed`));
  console.log("  Push, merge it to main by PR, then npm run deploy:production.");
}

main().catch((error) => stop(error.stderr?.trim() || error.message));
