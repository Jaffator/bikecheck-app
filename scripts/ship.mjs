// `npm run ship`: takes your commits from main or a branch through the version bump, a PR and its checks
// into main, then offers the deploy (docs/deploy.md). It never commits your work; that stays yours.
import { spawn } from "node:child_process";
import {
  CANCELLED,
  ROOT,
  VERSION_FILES,
  ask,
  ghJson,
  gitOk,
  highestTag,
  isEntryPoint,
  paint,
  pickVersion,
  readVersionFiles,
  releaseVersion,
  run,
  stop,
  versionMismatches,
  writeVersion,
} from "./release.mjs";

const CHECKS_APPEAR_TIMEOUT_MS = 90_000;
const POLL_MS = 3_000;
const FAILED_LOG_LINES = 40;

const wait = (ms) => new Promise((done) => setTimeout(done, ms));

export function releaseBranch(version) {
  return `release/${version}`;
}

// A version the package files already carry ahead of the last tag means the bump is done, so a rerun skips it.
export function pendingVersion(files, lastTag) {
  const version = JSON.parse(files[0].text).version;
  if (versionMismatches(files, version).length > 0) return null;
  const candidate = `v${version}`;
  return candidate !== lastTag && highestTag([lastTag ?? "v0.0.0", candidate]) === candidate ? candidate : null;
}

export function runIdFromLink(link) {
  return link.match(/\/actions\/runs\/(\d+)/)?.[1] ?? null;
}

export function lastLines(text, count) {
  return text.split(/\r?\n/).slice(-count).join("\n");
}

async function checkPreconditions() {
  const branch = await run("git", ["branch", "--show-current"]);
  if (!branch) stop("Not on a branch (detached HEAD).");
  if (await run("git", ["status", "--porcelain"])) stop("You have uncommitted changes; commit them first.");
  try {
    await run("gh", ["auth", "status"]);
  } catch {
    stop("gh is not logged in; run `gh auth login`.");
  }
  if (!(await gitOk(["fetch", "origin", "--tags"]))) stop("git fetch failed.");
  return branch;
}

async function confirmShip({ branch, version, pending, commits }) {
  const target = branch === "main" ? `${releaseBranch(version)} (new, your commits move off main)` : branch;
  console.log(`\nShip ${version}`);
  console.log(`  branch: ${target}`);
  console.log(`  bump:   ${pending ? "already committed" : `chore(release): ${version}`}`);
  console.log(`  ${commits.length} commit(s):`);
  commits.forEach((commit) => console.log(paint("dim", `    ${commit}`)));
  return ask("Continue? [y/N] ");
}

// main only takes PRs, so the commits ride a new branch and main goes back to origin.
async function moveOffMain(version) {
  const branch = releaseBranch(version);
  await run("git", ["switch", "-c", branch]);
  await run("git", ["branch", "-f", "main", "origin/main"]);
  console.log(paint("green", `✔ commits moved to ${branch}; main is back on origin`));
  return branch;
}

async function commitBump(version) {
  await writeVersion(version.slice(1));
  await run("git", ["add", ...VERSION_FILES]);
  await run("git", ["commit", "-m", `chore(release): ${version}`]);
  console.log(paint("green", `✔ chore(release): ${version} committed`));
}

async function ensurePr(branch) {
  const open = await ghJson(["pr", "list", "--head", branch, "--state", "open", "--json", "number,url"]);
  if (open.length > 0) {
    console.log(paint("green", `✔ PR #${open[0].number} updated: ${open[0].url}`));
    return open[0].number;
  }
  const url = await run("gh", ["pr", "create", "--base", "main", "--head", branch, "--fill-first"]);
  console.log(paint("green", `✔ PR created: ${url}`));
  return Number(url.match(/\/pull\/(\d+)/)[1]);
}

// Branch protection merges only branches that are up to date with main.
async function catchUpWithMain(pr, branch) {
  if ((await run("git", ["rev-list", "--count", "HEAD..origin/main"])) === "0") return;
  await run("gh", ["pr", "update-branch", String(pr)]).catch(() =>
    stop(`PR #${pr} cannot take main cleanly; merge main into ${branch}, resolve the conflicts, commit and rerun.`),
  );
  await run("git", ["pull", "--ff-only"]);
  console.log(paint("green", `✔ ${branch} caught up with main`));
}

// Right after a push GitHub may still list the previous commit's checks, which would pass at once.
async function waitForChecks(pr) {
  const head = await run("git", ["rev-parse", "HEAD"]);
  const deadline = Date.now() + CHECKS_APPEAR_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const { headRefOid } = await ghJson(["pr", "view", String(pr), "--json", "headRefOid"]);
    const checks = headRefOid === head ? await ghJson(["pr", "checks", String(pr), "--json", "name"]).catch(() => []) : [];
    if (checks.length > 0) return;
    await wait(POLL_MS);
  }
  stop(`No checks on PR #${pr} after ${CHECKS_APPEAR_TIMEOUT_MS / 1000} s; look at it on GitHub.`);
}

function watchInTerminal(pr) {
  return new Promise((done) => {
    const args = ["pr", "checks", String(pr), "--watch", "--fail-fast", "--required", "--interval", "5"];
    const child = spawn("gh", args, { cwd: ROOT, stdio: "inherit" });
    child.on("close", (code) => done(code === 0));
  });
}

async function reportFailedChecks(pr) {
  const checks = await ghJson(["pr", "checks", String(pr), "--json", "name,bucket,link"]);
  const failed = checks.filter((check) => check.bucket === "fail");
  const runIds = new Set();
  for (const check of failed) {
    console.log(`${paint("red", `❌ ${check.name}`)}\n   ${check.link}`);
    const runId = runIdFromLink(check.link);
    if (runId) runIds.add(runId);
  }
  // One run holds every failed job, so each log prints once.
  for (const runId of runIds) {
    const log = await run("gh", ["run", "view", runId, "--log-failed"]).catch(() => "");
    if (log) console.log(paint("dim", lastLines(log, FAILED_LOG_LINES)));
  }
  stop(`Checks failed on PR #${pr}; fix it, commit and rerun npm run ship.`);
}

async function watchChecks(pr) {
  await waitForChecks(pr);
  console.log(`\nChecks on PR #${pr}:`);
  if (!(await watchInTerminal(pr))) await reportFailedChecks(pr);
  console.log(paint("green", "✔ checks passed"));
}

async function mergePr(pr, branch) {
  await run("gh", ["pr", "merge", String(pr), "--merge", "--delete-branch"]);
  // gh may already be back on main without the branch; these make sure either way.
  await run("git", ["switch", "main"]);
  await run("git", ["pull", "--ff-only"]);
  await gitOk(["branch", "-D", branch]);
  console.log(paint("green", `✔ PR #${pr} merged; you are on main`));
}

async function main() {
  const branch = await checkPreconditions();
  const commits = (await run("git", ["log", "--format=%h %s", "origin/main..HEAD"])).split(/\r?\n/).filter(Boolean);
  if (commits.length === 0) {
    console.log("Nothing to ship: no commits ahead of origin/main.");
    return;
  }
  const lastTag = highestTag((await run("git", ["tag", "--list", "v*"])).split(/\r?\n/));
  const pending = pendingVersion(await readVersionFiles(), lastTag);
  const version = pending ?? (await pickVersion(lastTag));
  if (version === null || !(await confirmShip({ branch, version, pending, commits }))) {
    console.log(CANCELLED);
    return;
  }
  const shipBranch = branch === "main" ? await moveOffMain(version) : branch;
  if (!pending) await commitBump(version);
  await run("git", ["push", "-u", "origin", "HEAD"]);
  const pr = await ensurePr(shipBranch);
  await catchUpWithMain(pr, shipBranch);
  await watchChecks(pr);
  await mergePr(pr, shipBranch);
  if (await ask(`Deploy ${version} now? [y/N] `)) await releaseVersion(version);
  else console.log(`Not deployed; run npm run deploy:production when ready.`);
}

if (isEntryPoint(import.meta.url)) {
  main().catch((error) => stop(error.stderr?.trim() || error.message));
}
