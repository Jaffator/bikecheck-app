import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bumpVersion,
  deployProgress,
  failedStep,
  highestTag,
  progressBar,
  versionMismatches,
} from "./release.mjs";

const step = (name, status, conclusion = null) => ({ name, status, conclusion });
const job = (name, status, steps, conclusion = null) => ({ name, status, conclusion, steps });

describe("highestTag", () => {
  it("picks the highest vX.Y.Z by number, not by text", () => {
    assert.equal(highestTag(["v1.2.0", "v1.10.0", "v1.9.3"]), "v1.10.0");
  });

  it("ignores tags that are not vX.Y.Z", () => {
    assert.equal(highestTag(["v2.0.0-rc1", "release", "v1.3.1"]), "v1.3.1");
  });

  it("returns null without a release tag", () => {
    assert.equal(highestTag([]), null);
  });
});

describe("bumpVersion", () => {
  it("bumps the patch for a bug fix", () => {
    assert.equal(bumpVersion("v1.3.1", "patch"), "v1.3.2");
  });

  it("bumps the minor and resets the patch for a feature", () => {
    assert.equal(bumpVersion("v1.3.1", "minor"), "v1.4.0");
  });

  it("bumps the major and resets the rest", () => {
    assert.equal(bumpVersion("v1.3.1", "major"), "v2.0.0");
  });
});

describe("versionMismatches", () => {
  const lock = (root, pkg) => JSON.stringify({ version: root, packages: { "": { version: pkg }, "node_modules/a": { version: "9.9.9" } } });

  it("passes files that already carry the version", () => {
    const files = [
      { file: "package.json", text: '{ "version": "1.4.0" }' },
      { file: "package-lock.json", text: lock("1.4.0", "1.4.0") },
    ];
    assert.deepEqual(versionMismatches(files, "1.4.0"), []);
  });

  it("names a package.json left on the old version", () => {
    const files = [{ file: "package.json", text: '{ "version": "1.3.1" }' }];
    assert.deepEqual(versionMismatches(files, "1.4.0"), [{ file: "package.json", found: "1.3.1" }]);
  });

  it("catches a lock whose root package still has the old version", () => {
    const files = [{ file: "package-lock.json", text: lock("1.4.0", "1.3.1") }];
    assert.deepEqual(versionMismatches(files, "1.4.0"), [{ file: "package-lock.json", found: "1.3.1" }]);
  });
});

describe("deployProgress", () => {
  it("gives every job an equal share filled by its finished steps", () => {
    const jobs = [
      job("release", "completed", [step("a", "completed"), step("b", "completed")], "success"),
      job("deploy", "in_progress", [step("a", "completed"), step("b", "in_progress"), step("c", "pending"), step("d", "pending")]),
    ];
    assert.equal(deployProgress(jobs, 0).percent, 63);
  });

  it("counts jobs that have not appeared yet as empty shares", () => {
    const jobs = [job("release", "completed", [step("a", "completed")], "success")];
    assert.equal(deployProgress(jobs, 4).percent, 25);
  });

  it("names the running job and step, shortening matrix values to the first", () => {
    const jobs = [
      job("images (caddy, ., docker/caddy.Dockerfile)", "in_progress", [step("Set up job", "completed"), step("Build and push", "in_progress")]),
    ];
    assert.equal(deployProgress(jobs, 0).current, "images (caddy) · Build and push");
  });

  it("names a queued job without a step", () => {
    assert.equal(deployProgress([job("deploy", "queued", [])], 0).current, "deploy");
  });
});

describe("failedStep", () => {
  it("names the failed job and step", () => {
    const jobs = [
      job("release", "completed", [step("a", "completed", "success")], "success"),
      job("checks / backend", "completed", [step("Set up job", "completed", "success"), step("Unit tests", "completed", "failure")], "failure"),
    ];
    assert.equal(failedStep(jobs), "checks / backend · Unit tests");
  });

  it("returns null when no job failed", () => {
    assert.equal(failedStep([job("release", "completed", [], "success")]), null);
  });
});

describe("progressBar", () => {
  it("fills 20 cells in proportion", () => {
    assert.equal(progressBar(50), "[██████████░░░░░░░░░░]");
  });
});
