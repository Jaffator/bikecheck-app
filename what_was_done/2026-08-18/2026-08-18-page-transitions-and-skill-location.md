# Page transition rework and the skill that was never loading

Branch `feat/add-bike-steps-2-3`, still on top of commit `38c4a9f`.

**Nothing here is committed**, and that now includes everything from yesterday
as well. The whole branch can still be discarded with git.

This is a short day. It continues
[2026-08-17-bike-upload-and-garage.md](../2026-08-17/2026-08-17-bike-upload-and-garage.md),
which describes the six large pieces of work on this branch. Only two things
changed since that document was written, and everything it lists as broken or
pending is still broken or pending.

**Still never seen running.** The dev server has not been started on this branch
at any point. The transition changes below are the kind that can only be judged
by watching them, and they have not been watched.

---

## 1. The page transitions were retuned

Section 6 of yesterday's document describes the slide transitions as they were
at 19:30. Three files changed after that, so parts of that description are now
out of date. What is on disk today:

**Timing and easing changed.** The duration went from 260 ms to **480 ms**, and
the easing from the earlier curve to `cubic-bezier(0.16, 0.9, 0.55, 1)`. The two
were changed together and the reasoning is commented in place: the new curve
finishes braking earlier, so the old 260 ms budget would have left the panel
sitting still at the end of its own animation. The comment also records which
way to push the second control point to lengthen or flatten the tail, so the
next person tuning this does not have to rediscover it.

**Layers now paint their own background.** `PageTransition` gained a `surface`
prop. Pages in this app carry no background of their own — it lives on the
AppShell — so two bare sliding layers showed through each other while in flight.
Each layer now paints `surface` for exactly as long as it is animating, and is
transparent at rest so the AppShell background and the footer gradient still
show. The header passes `var(--mantine-color-cards-7)`; the content slot uses
the default `var(--mantine-color-background-9)`.

**Same-route re-renders no longer restart the animation.** When the pathname is
unchanged but the children are not — a query resolving, a wizard step advancing —
the frame content is swapped without starting a transition. There is an identity
bail-out on the children so this does not re-render on every parent render.

**Arriving pages no longer fade.** `pageSlideInLeft` and `pageSlideInRight`
animate transform only. An arriving page is the layer the eye lands on, and a
translucent one showed the outgoing page straight through it. The page that stays
*underneath* still dims to 0.6 as it gives way — that one is meant to recede.

| File | | Role |
|---|---|---|
| `PageTransition.tsx` | new | 159 lines (134 yesterday) — `surface`, the same-route bail-out, retuned constants |
| `global.css` | edited | arriving keyframes lost their opacity ramp |
| `AppLayout.tsx` | edited | passes `surface` to the header instance |

### Broken / incomplete

- **Never seen running.** 480 ms, the 25% travel of the page underneath and the
  0.6 dim are still picked by feel, not measured against a design. 480 ms is
  long for a mobile transition — it is the number most likely to feel wrong the
  first time you watch it, and the easing comment tells you how to move it.
- **The exit is still timed by `setTimeout`, not `animationend`.** Unchanged from
  yesterday. A throttled animation still gets its outgoing frame pulled at the
  duration mark regardless of whether it finished.
- **Header and content are still two independent animations.** Same pathname,
  same duration, nothing synchronising them. The longer 480 ms window makes any
  drift between them easier to see, not harder.
- **Still no `prefers-reduced-motion` handling**, and the movement is now longer.
- **`surface` must be kept in step with whatever is actually behind the slot.**
  It is a hardcoded colour passed by the caller, so a future theme change to the
  header or shell background will silently desynchronise the in-flight layer
  from the surface it is meant to match.

---

## 2. The `what-was-done` skill was in a directory Claude Code never reads

The skill existed at `.github/skills/what-was-done/SKILL.md` and was invisible —
Claude Code only scans `.claude/skills/`. `.github/skills/` is a real location,
but for GitHub Copilot, not for Claude Code.

The directory was moved to `.claude/skills/what-was-done/`. `git mv` failed
because the source was untracked and git therefore considered it empty; a plain
`mv` did the move. The file is intact, unchanged, 5085 bytes.

**`.github/skills/review-domain-architecture/` was left where it is.** It was not
part of what you asked to move, so it is still in the Copilot location and still
invisible to Claude Code. If that one is also meant for Claude Code, it needs the
same move.

`.claude/skills/` is untracked, so this whole skill is currently outside git.

### Decision

**Which tool owns these skills.** The two skill directories now live in two
different places for two different tools. If both are meant for Claude Code,
move the second one. If both tools are meant to see them, they need a copy in
each location — there is no shared directory that both read.

---

## What is left

Everything in yesterday's list is unchanged. Re-verified on disk today:

### For you to run

1. **Apply the migration.** `20260817120000_cascade_mounted_component_children`
   is still unapplied. Until then, deleting a bike with service history still
   fails outright.
   ```
   cd _backend
   npx prisma migrate deploy
   npx prisma generate
   ```
   The pre-change backup is at
   `~/db_backups/monolith_dev_2026-08-17_143228.dump`.

2. **Look at the UI.** Add-bike step 2 and 3, the summary modal, the confirmation
   screen, the Bikes tab and now the retuned transitions have never been
   rendered. The transitions are the item where looking is not optional — a
   timing value cannot be reviewed any other way.

3. **Re-run `gen:api`** with the server up. The generated schema is still a
   revision behind: `bike_type`, the removed `frame_material` and the new length
   limits are missing from it.

### Still open from yesterday

- **Component names in validation errors** — only the first error is rewritten,
  cause never found, work stopped on request.
- **The 7 MB photo already in R2** — resizing only applies to new uploads.
- **The `CLOUDFARE_PUBLIC_URL` typo** — confirmed still present today, on two
  `console.log` lines in `storage.service.ts:64-65`. The `return` uses the
  correct spelling, so only the log output is wrong.
- **Wear bars have no data source**; the badge reads "Good" for every bike.
- **`frame_material`** is still in the database and in `ResponseBikeDto` but no
  longer in the create path, so `BikeCard` will show it blank on every new bike.
- **Splitting the branch into commits.** It is now six concerns in one
  uncommitted block. The transitions remain the cleanest to split off.

---

## Verification

Re-run today, after the transition changes — not carried over from yesterday:

- Frontend: `npx tsc -b` exit 0. (Plain `tsc --noEmit` checks nothing in this
  repo — the root tsconfig is `"files": []` with project references.)
- Backend: `npx tsc --noEmit -p apps/monolith/tsconfig.app.json` exit 0.
- ESLint on `PageTransition.tsx` and `AppLayout.tsx`: exit 0.

Tests were not re-run today; nothing outside the two frontend layout files and
the skill directory changed. Yesterday's result stands —
`bike.service.unit.test.ts` has 4 tests failing for a pre-existing missing
`PinoLogger` provider, confirmed by stashing at the time.

None of this says anything about whether the app renders correctly.
