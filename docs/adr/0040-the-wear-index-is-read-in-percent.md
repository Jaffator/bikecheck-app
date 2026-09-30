# The wear index is read in percent

A brake pad wears by a wear index (`health_index`): the metres of descent on every downhill split,
weighted by how steep the split is and how heavy the rider is (`strava.service.ts`). The number is
honest about wear and means nothing to a rider. "412 of 1000" says neither how worn the pad is nor
how long it will last (issue #192).

**The wear index is read in percent.** Everywhere a pad is shown — the dashboard, Needs attention,
the bike's page, notifications — it reads as the percentage of its Service Interval, like every
other Tracked Action. The raw index appears in one place only: the Tracked Action drawer, next to
the interval it is measured against, because that is where the owner edits the interval.

## The index has no unit

It is not metres, though it is counted in metres: a split at 12 % counts its drop twice, and a
heavier rider counts more. Writing "412 m" would lie — the rider descended less than that. So the
index is shown as a bare number, and what it means is said in time instead.

## What is left is said in descent time

Each ride stores its **Descent Time** (`rides.descent_min`): the moving time of the same downhill
splits the index counts, so index and time come from one source. The bike's pace is Σ index / Σ
descent minutes over its latest 10 non-deleted rides that have a Descent Time. The Tracked Action
then carries `remaining_descent_min` = (interval in force − current) / pace, rounded down.

It is null — and the drawer says nothing — when:

- the Tracked Action is not on the `health_index` axis;
- fewer than 3 rides, or under 30 minutes of descent, are behind the pace;
- those rides wore the pads by nothing, so there is no pace to count down at;
- the interval is already passed: the percentage and its colour already say so.

The pace is the bike's, not the pad's: every pad on a bike rides the same descents.

## Considered options

**Backfilling Descent Time from `json_data`** was rejected for now: old rides are left null and out
of the pace, which fills itself within a few rides. It can be added later without changing anything
here.

**Remaining as metres of descent** was rejected for the reason the index has no unit.

**Storing the estimate** was rejected: like every reading, it is derived on read (ADR 0026).

## Consequences

- `rides.descent_min` is written on import and on re-sync; rides imported before it stay null.
- Every Tracked Action response carries `remaining_descent_min` (minutes or null). The bike page and
  the garage list fill it; the internal evaluation that announces bands does not read rides for it.
- The drawer shows it as hours ("≈ 9 h of descent left") — the frontend's half, a separate issue.
