# Service Tracking is computed on read

Rides sync from Strava and quietly grow every mounted component's accumulators, but nothing turned
that into an answer to the only question the owner actually has: *what needs doing, and how soon?*
The owner could open a part and read "1 200 km" — a number with no meaning unless they remember the
interval for that job on that bike. Service Tracking is the derivation that gives it meaning.

**Nothing about a reading is stored.** A Tracked Action's percentage is computed at the moment of
the read, from three things that are already stored for their own reasons:

```
progress = (accumulator − baseline) / (interval + extension)
```

The accumulator is on `components_mounted`, grown by the ride sync. The Wear Baseline is in
`action_done_component_map`, frozen when the job was last recorded. The Service Interval is on
`bike_service_interval`, materialized when the bike was created. The Extension is the only
new input, and it is what the owner chose rather than something derived.

## Why nothing is stored

A stored percentage has to be recomputed by every write path that can move any of its inputs: a
ride saved, a ride re-synced, a Service recorded, edited or deleted, a Replacement, a manual
correction of a part's wear, a change to a Service Interval, a postponement. Nine paths, each of
which can leave a permanently wrong number behind by forgetting. Deriving on read means a corrected
mileage and a lengthened interval both show up straight away, with no write path involved and
nothing to backfill — which is also exactly what the owner expects of a correction.

The read costs three queries per bike and arithmetic over what they return. The counts here are
small — a bike carries tens of parts, not thousands — and the alternative buys speed with a class
of bug that has no upper bound on how wrong it can get.

## What is stored is what a derivation cannot know

One row per Tracked Action, in `tracked_action_state`, holding exactly two things:

- **The Extension.** What the owner deferred, per axis. Nothing in the wear record implies it.
- **`reached_threshold`.** Which band has already been announced — 0, 80, 95 or 100.

The threshold is stored because a notification is an event, not a state: "is it at 95% now" is
derivable, "have I already told you" is not. It is always moved to the band the current percentage
falls in, up or down. A move **up** to 95 or 100 sends a notification; a move up to 80 sends none;
a move **down** is silent and re-arms. That one rule covers Service, Replacement, Extension and
interval changes without a special case for any of them: each of the four lowers the percentage,
the band moves down with it, and the next crossing announces again.

Because it is one row, resetting a Tracked Action is one write, and the row dies with the part
through the existing cascade — so there is no cleanup job to forget, and a new chain is never born
already deferred.

## The percentage is never capped

132% reads as 132%. A capped reading cannot tell "just due" from "2 000 km overdue", which is the
difference between a job for this weekend and a job for tonight.

It is reported in whole percent, **rounded down**, and the Attention Level is read from that same
whole number. Two things follow, and both matter. A row showing 95% is never coloured as though it
were 94 — the number on screen and the colour behind it cannot disagree, because they are the same
number. And a reading never bands as due before it is: 99.6% of the way to due rounds *up* to 100
and would read overdue while the part still has kilometres left on it, so it floors to 99 instead.

## Attention Levels

good below 80 · warning 80–94 · critical 95–99 · overdue at 100 and above.

The three numbers are constants in one place. They are shared by the colour bands, the dashboard's
cutoff and the announcements, so a row cannot change colour for one reason and notify for another.

## The axis is whichever the bike's interval fills in

A `bike_service_interval` row carries kilometres, minutes and a wear index, and fills in whichever
the job is measured by. The accumulator read against it is the one the ride sync actually feeds for
that kind of part: a chain, a cassette and a chainring wear by their drivetrain kilometres, a fork
and a shock by the minutes they worked, everything else by the bike's own totals. The read has to
look at the column the writer fills, so the two lists live beside the derivation and are named as
mirroring `strava.service.ts`.

Where an interval sets more than one axis, the highest resulting percentage wins: the part is due
when the first of its measures says so. No seeded interval sets more than one today.

A wear index has no frozen column in `action_done_component_map`. The parts measured by one are
replaced rather than serviced — the only seeded health-index interval is Pads Replacement — and a
Replacement starts a new mounted component whose index is zero (ADR 0003), so the reading resets
through the new row rather than through a baseline.

**This is a real limitation, not only a simplification.** Recording a Service against a health-index
part without replacing it does *not* reset that part's reading, because there is nothing to freeze
it against. If an action measured by a wear index is ever added that is genuinely serviced rather
than replaced, `action_done_component_map` needs a `health_index_at_time` column and the derivation
needs to read it, exactly as it reads the other four.

## Considered options

**Storing the percentage on the mounted component** was rejected for the reason above: it converts
one read into nine writes, each of which can be wrong forever.

**A scheduled job that recomputes everything nightly** was rejected because every axis Service
Tracking measures moves only through a write the app itself makes. There is nothing for a clock to
discover, and a nightly job would mean a corrected mileage did not show up until tomorrow.

**Capping at 100%** was rejected: the number past 100 is the most useful number on the screen.

## Consequences

- No write path recomputes anything. The announcements (#71) are the one place that writes, and
  they write only `reached_threshold`.
- An owner who has never recorded a Service still gets real readings: the baseline is zero, so
  mileage entered when a used part was added counts as wear.
- An action the bike keeps no `bike_service_interval` row for produces no Tracked Action at all,
  rather than a row with no percentage to show.
- Archived bikes (ADR 0024) and removed or deleted components produce no Tracked Actions, on every
  path.
