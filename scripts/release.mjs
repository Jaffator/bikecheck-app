// `npm run deploy:production`: tags main once its version is committed, and follows the Deploy run (docs/deploy.md).
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { promisify, styleText } from "node:util";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const VERSION_FILES = [
  "_frontend/bikecheck/package.json",
  "_frontend/bikecheck/package-lock.json",
  "_website_landing/package.json",
  "_website_landing/package-lock.json",
];
const ACTIONS_URL = "https://github.com/Jaffator/bikecheck-app/actions/workflows/deploy.yml";
const TAG_PATTERN = /^v(\d+)\.(\d+)\.(\d+)$/;
const KINDS = [
  { kind: "patch", label: "bug fix" },
  { kind: "minor", label: "new feature" },
  { kind: "major", label: "major" },
];
const FIND_RUN_TIMEOUT_MS = 30_000;
const FIND_RUN_POLL_MS = 3_000;
const POLL_MS = 5_000;
const BAR_CELLS = 20;
const CANCELLED = "Cancelled; nothing changed.";

const execFileAsync = promisify(execFile);

function parseTag(tag) {
  return tag.match(TAG_PATTERN).slice(1).map(Number);
}

export function highestTag(tags) {
  const releases = tags.filter((tag) => TAG_PATTERN.test(tag));
  const byNumber = (a, b) => parseTag(a).reduce((diff, part, i) => diff || part - parseTag(b)[i], 0);
  return releases.sort(byNumber).at(-1) ?? null;
}

export function bumpVersion(tag, kind) {
  const [major, minor, patch] = parseTag(tag);
  if (kind === "major") return `v${major + 1}.0.0`;
  if (kind === "minor") return `v${major}.${minor + 1}.0`;
  return `v${major}.${minor}.${patch + 1}`;
}

export function versionMismatches(files, version) {
  return files.flatMap(({ file, text }) => {
    const json = JSON.parse(text);
    // A lock repeats the version on its root package.
    const versions = json.packages?.[""] ? [json.version, json.packages[""].version] : [json.version];
    const stale = versions.filter((found) => found !== version);
    return stale.length ? [{ file, found: stale[0] }] : [];
  });
}

// Matrix jobs are named after every matrix value; the first one is enough to tell them apart.
function shortJobName(name) {
  return name.replace(/\(([^,)]*)[^)]*\)/, "($1)");
}

function jobLabel(job, step) {
  return [shortJobName(job.name), step?.name].filter(Boolean).join(" · ");
}

function jobShare(job) {
  if (job.status === "completed") return 1;
  if (job.steps.length === 0) return 0;
  return job.steps.filter((s) => s.status === "completed").length / job.steps.length;
}

// Jobs not created yet count as empty shares, so their appearance cannot pull the bar back.
export function deployProgress(jobs, expectedJobs) {
  const total = Math.max(jobs.length, expectedJobs, 1);
  const percent = Math.round((jobs.reduce((sum, job) => sum + jobShare(job), 0) / total) * 100);
  const job = jobs.find((j) => j.status === "in_progress") ?? jobs.find((j) => j.status !== "completed");
  const runningStep = job?.steps.find((s) => s.status === "in_progress");
  const current = job ? jobLabel(job, runningStep) : "";
  return { percent, current };
}

export function failedStep(jobs) {
  const job = jobs.find((j) => j.conclusion === "failure");
  if (!job) return null;
  return jobLabel(job, job.steps.find((s) => s.conclusion === "failure"));
}

export function progressBar(percent) {
  const filled = Math.round((percent / 100) * BAR_CELLS);
  return `[${"█".repeat(filled)}${"░".repeat(BAR_CELLS - filled)}]`;
}

async function run(cmd, args) {
  const { stdout } = await execFileAsync(cmd, args, { cwd: ROOT, maxBuffer: 16 * 1024 * 1024 });
  return stdout.trim();
}

async function ghJson(args) {
  return JSON.parse(await run("gh", args));
}

async function gitOk(args) {
  try {
    await run("git", args);
    return true;
  } catch {
    return false;
  }
}

// styleText drops the colours when the stream is not a terminal or NO_COLOR is set.
function paint(format, text, stream = process.stdout) {
  return styleText(format, text, { stream });
}

function stop(reason) {
  console.error(paint("red", `✖ ${reason}`, process.stderr));
  process.exit(1);
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function checkPreconditions() {
  const branch = await run("git", ["branch", "--show-current"]);
  if (branch !== "main") stop(`On '${branch}', releases are cut from main.`);
  if (await run("git", ["status", "--porcelain"])) stop("Working tree is not clean; commit or stash first.");
  if (!(await gitOk(["pull", "--ff-only"]))) stop("git pull --ff-only failed; main has diverged from origin.");
  if (!(await gitOk(["fetch", "--tags"]))) stop("git fetch --tags failed.");
  // Deploy refuses a tag that is not on origin's main.
  if ((await run("git", ["rev-list", "--count", "origin/main..HEAD"])) !== "0") stop("main has unpushed commits; push first.");
  try {
    await run("gh", ["auth", "status"]);
  } catch {
    stop("gh is not logged in; run `gh auth login`.");
  }
}

async function pickVersion(rl, lastTag) {
  const base = lastTag ?? "v0.0.0";
  console.log(`\nLast version: ${lastTag ?? "none"}`);
  KINDS.forEach(({ kind, label }, i) => console.log(`  ${i + 1}) ${label.padEnd(13)} → ${bumpVersion(base, kind)}`));
  console.log(`  ${KINDS.length + 1}) cancel`);
  const answer = Number((await rl.question("\nChoice: ")).trim());
  const picked = KINDS[answer - 1];
  return picked ? bumpVersion(base, picked.kind) : null;
}

async function confirm(rl, version, lastTag) {
  const head = await run("git", ["log", "-1", "--format=%h %s"]);
  const count = lastTag ? await run("git", ["rev-list", "--count", `${lastTag}..HEAD`]) : "all";
  console.log(`\nRelease ${version}\n  main: ${head}\n  ${count} commit(s) since ${lastTag ?? "the start"}`);
  const answer = (await rl.question("Continue? [y/N] ")).trim().toLowerCase();
  return answer === "y" || answer === "yes";
}

// The App's About and the Website's footer and ?v= read these, so a tag must not outrun them.
async function checkVersionFiles(version) {
  const files = await Promise.all(
    VERSION_FILES.map(async (file) => ({ file, text: await readFile(resolve(ROOT, file), "utf8") })),
  );
  const stale = versionMismatches(files, version.slice(1));
  if (stale.length === 0) return;
  stop(`Not on ${version} yet: ${stale.map((s) => `${s.file} (${s.found})`).join(", ")}. Bump, commit and push first.`);
}

async function tagAndRelease(version) {
  await run("git", ["tag", version]);
  await run("git", ["push", "origin", version]);
  console.log(paint("green", `✔ ${version} tagged and pushed`));
  await run("gh", ["release", "create", version, "--verify-tag", "--generate-notes"]);
  console.log(paint("green", `✔ GitHub Release ${version} created`));
}

// The last good push run tells how many jobs a deploy has before they are all created.
async function expectedJobCount() {
  const runs = await ghJson(["run", "list", "--workflow", "deploy.yml", "--event", "push", "--status", "success", "--limit", "1", "--json", "databaseId"]);
  if (runs.length === 0) return 0;
  const { jobs } = await ghJson(["run", "view", String(runs[0].databaseId), "--json", "jobs"]);
  return jobs.length;
}

async function findRun(version) {
  const deadline = Date.now() + FIND_RUN_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const runs = await ghJson(["run", "list", "--workflow", "deploy.yml", "--branch", version, "--event", "push", "--limit", "1", "--json", "databaseId,url"]);
    if (runs.length > 0) return runs[0];
    await wait(FIND_RUN_POLL_MS);
  }
  return null;
}

function draw(lines, previousCount) {
  if (process.stdout.isTTY && previousCount > 0) process.stdout.write(`\x1b[${previousCount}A\x1b[0J`);
  process.stdout.write(`${lines.join("\n")}\n`);
}

// A wrapped line would leave a stale copy, as draw moves the cursor up by lines written.
function fit(line) {
  return process.stdout.columns ? line.slice(0, process.stdout.columns - 1) : line;
}

async function followRun(version) {
  const found = await findRun(version);
  if (!found) {
    console.warn(paint("yellow", `⚠ No Deploy run for ${version} after ${FIND_RUN_TIMEOUT_MS / 1000} s; follow it in ${ACTIONS_URL}`, process.stderr));
    return;
  }
  process.once("SIGINT", () => {
    console.log(`\nStopped watching; the run keeps going: ${found.url}`);
    process.exit(0);
  });
  const expected = await expectedJobCount().catch(() => 0);
  let shown = 0;
  let drawn = 0;
  for (;;) {
    const deployRun = await ghJson(["run", "view", String(found.databaseId), "--json", "status,conclusion,jobs,url"]);
    const { status, jobs } = deployRun;
    const progress = deployProgress(jobs, expected);
    // A run longer than the last one must not reach 100 % before it ends.
    shown = status === "completed" ? 100 : Math.min(99, Math.max(shown, progress.percent));
    const lines = [fit(`Deploy ${version}  ${progressBar(shown)}  ${String(shown).padStart(3)} %`)];
    if (status !== "completed") lines.push(paint("dim", fit(`  ▸ ${progress.current || "waiting for a runner"}`)));
    draw(lines, drawn);
    drawn = lines.length;
    if (status === "completed") return report(version, deployRun);
    await wait(POLL_MS);
  }
}

function report(version, { conclusion, jobs, url }) {
  if (conclusion === "success") {
    console.log(paint("green", `✅ ${version} is live`));
    return;
  }
  const failed = failedStep(jobs);
  console.log(`${paint("red", `❌ Deploy ${version} ${conclusion}${failed ? ` at ${failed}` : ""}`)}\n   ${url}`);
  process.exitCode = 1;
}

async function main() {
  await checkPreconditions();
  const lastTag = highestTag((await run("git", ["tag", "--list", "v*"])).split(/\r?\n/));
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.on("SIGINT", () => {
    console.log(`\n${CANCELLED}`);
    process.exit(0);
  });
  const version = await pickVersion(rl, lastTag);
  if (version !== null) await checkVersionFiles(version);
  const go = version !== null && (await confirm(rl, version, lastTag));
  rl.close();
  if (!go) {
    console.log(CANCELLED);
    return;
  }
  // A tag may already be out, so a rerun would trip over it; say how to finish instead.
  await tagAndRelease(version).catch((error) =>
    stop(`${error.stderr?.trim() || error.message}\n  finish ${version} with docs/deploy.md "Shipping a release" by hand.`),
  );
  await followRun(version);
}

// Windows hands the drive letter in either case.
const invokedDirectly = process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (invokedDirectly) {
  main().catch((error) => stop(error.stderr?.trim() || error.message));
}
