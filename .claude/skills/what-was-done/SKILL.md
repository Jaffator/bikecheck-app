---
name: what-was-done
description: 'Write a handover summary of uncommitted work into what_was_done/. Use when the user asks what was done, wants a session summary, is losing track of changes made while they were not coding, or says "udelej na to skill"-style recaps of the current branch state.'
argument-hint: 'Optionally name a scope, for example: only the backend, or since commit abc123. Defaults to everything uncommitted on the current branch.'
user-invocable: true
disable-model-invocation: false
---

# What Was Done

Write a handover document describing work the user did not write themselves, so
they can regain control over the current state of the branch.

The reader is the person who owns this code but was not at the keyboard. They
need to know what exists now, what is broken, and what only they can decide.

## Gather the facts first

Never write this document from conversation memory alone — memory omits and
flatters. Establish the real state:

```bash
git status --short
git diff --stat
git log --oneline -1
```

Then, for anything the summary will claim:

- Read the files you are describing. A file changed by a linter or by the user
  mid-session may not match what you remember writing.
- Distinguish generated files (`schema.d.ts`, `package-lock.json`,
  `*_schema.json`, migrations output) from hand-written ones. Generated files
  dominate the line counts and mean nothing to the reader.
- Re-run the checks before claiming they pass. In this repo:
  - frontend: `cd _frontend/bikecheck && npx tsc -b` (plain `tsc --noEmit`
    checks nothing here — the root tsconfig has `"files": []` with references)
  - backend: `cd _backend && npx tsc --noEmit -p apps/monolith/tsconfig.app.json`
  - lint: `npx eslint <changed paths>`
- If a test fails, check whether it failed before the changes (`git stash`,
  re-run, `git stash pop`) and say which it is.

## What the document must contain

Group by feature or user-visible outcome, never by file — the reader thinks in
features, not paths. Within each group:

- **What it does now**, in the words of someone using the app.
- **Which files**, marked new vs edited, with a short note on each one's job.
- **What is broken, missing, or unverified** — this is the most valuable part of
  the document and the easiest to soften. Do not soften it.

Then a section for what remains, split by who can act:

- **The user** — steps only they can run (migrations against their database,
  looking at the UI, anything touching production).
- **Decisions** — questions where you picked a default and they may disagree, or
  where the work is blocked on a product call.

Rules for the content:

- State plainly what was not verified. If the dev server was never started, the
  UI was never seen — say so. Never let passing typechecks imply working UI.
- Include a "not committed" note when nothing is committed, so the reader knows
  the whole thing can be discarded.
- Name unresolved bugs even when the user told you to stop working on them.
- Skip praise, effort narration, and anything the reader can read off git.

## Style: short, clear, scannable

This document is scanned by someone catching up, not read for pleasure. Brevity
is the point — a long handover does not get read, and an unread handover is
worth nothing.

- **One idea per sentence.** Cut every clause that does not change what the
  reader does next.
- **Lead with the outcome**, then the mechanism if it still matters. The reader
  wants "the slide is 480 ms and has never been watched", not the story of how
  it got there.
- **A finding is one line.** Name the thing, then the consequence. If it needs a
  paragraph, it is two findings or it is over-explained.
- **No design rationale in prose.** Why a value was chosen belongs in a code
  comment, not in the handover. The handover says what it is and whether it was
  verified.
- **Tables over paragraphs** for anything with repeating shape — files, checks,
  settings. Prose only for things that genuinely need a sentence.
- **No throat-clearing.** No "it is worth noting", no restating the section
  title, no recapping what the reader just read.

Aim for a document read end to end in two minutes. If a section grew past that,
it is describing work instead of reporting state — cut it back.

## Where it goes

One folder per day, holding both files:

```
what_was_done/YYYY-MM-DD/YYYY-MM-DD-<short-slug>.md
what_was_done/YYYY-MM-DD/YYYY-MM-DD-<short-slug>.html
```

Dated from the actual date. The slug names the work ("bike-upload-and-garage"),
not the session. The date repeats in the filename on purpose, so a file still
identifies itself once it is moved, attached or downloaded.

If a folder for today already exists, extend the files in it rather than
starting a second pair — one document per day of work, whatever the day's work
turned out to cover.

### 1. The Markdown

Write it in English like the rest of the repo. Prose and short tables; no
decorative structure. Numbered lists only where the order is real, such as steps
the user has to run in sequence.

### 2. The HTML

Same content, written straight into `what_was_done/` beside the Markdown — not
into the scratchpad. Both files are committed together, so the document can be
read without checking out the branch or opening a Markdown viewer.

Then publish that same file with the `Artifact` tool for phone reading and
sharing. Load the `artifact-design` skill first.

Keep it a review document, not a landing page: utilitarian treatment, real
typographic hierarchy, no oversized hero. What the format earns over the Markdown
is scanning — so encode severity in form, not just wording:

- A totals strip at the top (files edited, files new, migrations, dependencies)
  so the scale is visible before any reading.
- Findings marked by kind, with semantic colour separate from the accent hue:
  fixed, incomplete, broken, needs-data. The reader should be able to find every
  broken thing without reading a sentence.
- The remaining-work section split by actor, each item labelled with who acts.
- Both light and dark themes, per the token pattern in `artifact-design`.

Reuse the same artifact URL when updating the same day's document: pass the
existing URL as `url`, or find it with `action: "list"`. A new day gets a new
artifact.

## Then

Give the user both file paths and the artifact URL, then say the two or three
things from it that matter most. Keep that to a few lines — the same brevity the
document itself follows. Do not paste the document back into the chat; it exists
to be read outside the conversation.
