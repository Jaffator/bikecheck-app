import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lastLines, pendingVersion, releaseBranch, runIdFromLink } from "./ship.mjs";

const pkg = (version) => ({ file: "package.json", text: JSON.stringify({ version }) });
const lock = (root, inner) => ({ file: "package-lock.json", text: JSON.stringify({ version: root, packages: { "": { version: inner } } }) });

describe("pendingVersion", () => {
  it("returns the version every file carries ahead of the last tag", () => {
    assert.equal(pendingVersion([pkg("1.4.4"), lock("1.4.4", "1.4.4")], "v1.4.3"), "v1.4.4");
  });

  it("returns null when the files are still on the last tag", () => {
    assert.equal(pendingVersion([pkg("1.4.3"), lock("1.4.3", "1.4.3")], "v1.4.3"), null);
  });

  it("returns null when the files disagree, so the bump rewrites them", () => {
    assert.equal(pendingVersion([pkg("1.4.4"), lock("1.4.3", "1.4.3")], "v1.4.3"), null);
  });

  it("returns null for a version behind the last tag", () => {
    assert.equal(pendingVersion([pkg("1.3.0")], "v1.4.3"), null);
  });

  it("compares by number, not by text", () => {
    assert.equal(pendingVersion([pkg("1.10.0")], "v1.9.0"), "v1.10.0");
  });
});

describe("releaseBranch", () => {
  it("names the branch after the version", () => {
    assert.equal(releaseBranch("v1.4.4"), "release/v1.4.4");
  });
});

describe("runIdFromLink", () => {
  it("reads the run id from a check's job link", () => {
    assert.equal(runIdFromLink("https://github.com/o/r/actions/runs/38697077163/job/116296074691"), "38697077163");
  });

  it("returns null for a link that is not an Actions run", () => {
    assert.equal(runIdFromLink("https://example.com/status"), null);
  });
});

describe("lastLines", () => {
  it("keeps the last lines of a log", () => {
    assert.equal(lastLines("a\nb\r\nc\nd", 2), "c\nd");
  });
});
