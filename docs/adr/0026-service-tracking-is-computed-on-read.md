# Service Tracking is computed on read, and only the announced threshold is stored

Every number Service Tracking shows already exists: the accumulators on `components_mounted` grow
with each ride, the Wear Baseline is frozen per action in `action_done_component_map` (ADR 0001),
and the Service Interval sits on `bike_service_interval` for the bike. A Tracked Action's
percentage is those three and an Extension, and nothing else:

```
progress = (accumulator − baseline) / (interval + extension)
```

It is derived on every read rather than stored. What *is* stored is one fact a calculation cannot
recover: the highest threshold the owner has already been told about.

## Why not materialise the percentage

Five separate things move a percentage — a ride arriving from Strava, a Service being recorded or
edited, a Replacement, the owner correcting a part's mileage by hand, and a change to the interval
or an Extension. A stored percentage is correct only while every one of those paths remembers to
write it, and a path that forgets leaves a number that is wrong for good and looks right. Deriving
it means a wrong number can only ever come from wrong inputs, which are visible on the screen the
owner is already looking at.

The read is small: a bike has tens of mounted components, not thousands, and the dashboard reads
one owner's active bikes. When that stops being true the derivation is a pure function over rows
already fetched, so it can be cached or materialised then, without changing what the app means.

## Why the threshold is stored

Announcements are the one part that must not be recomputed. Without memory the app either notifies
on every ride once the percentage is past 95%, or notifies only on the exact sync that crosses it —
and then a backfill of pending activities, a re-synced ride, or a corrected interval either
re-announces everything or silently announces nothing.

So each Tracked Action remembers `reached_threshold`: 0, 80, 95 or 100. An announcement is sent
only on a move upward, and the stored value is otherwise **always lowered to whatever band the
current percentage falls in**. That single rule covers every case that would otherwise be its own
branch: a Service resets it because the new Wear Baseline drops the percentage, a Replacement
because the new part starts at zero, an Extension because the interval grew, and a lengthened
interval for the same reason. Nothing in the code says "on service, clear the flag".

The thresholds themselves — 80, 95, 100 — are constants in one place. The stored value is the
number, not a symbol, so moving a threshold or adding a settings screen later needs no migration.

## What is announced, and what is not

80% is not announced. It is the point at which a Tracked Action appears on the dashboard, which is
a place the owner goes rather than an interruption. 95% and 100% send a push, and both land in the
in-app list. Email leaves `maintenance_due`'s channels: this is a message that repeats for the life
of every part on every bike, and a mailbox is the wrong place for it.

One sync sends at most one notification per bike, naming the counts ("Enduro: 2 actions due, 1
overdue") and opening that bike. A rider who syncs a month of riding at once crosses several
thresholds in one write; four pushes for one afternoon's backfill would teach them to turn
notifications off.

## Consequences

- The dashboard reads every active bike of the owner and keeps the Tracked Actions at 80% or above,
  sorted by percentage descending. The bike's own page shows all of its Tracked Actions.
- Percentages are not capped. 132% is a real reading and the overdue band is open-ended.
- Evaluation runs wherever an input changes, not on a schedule. There is no cron: every axis
  Service Tracking measures is moved by a write the app itself makes.
- An action with no interval for the bike has no Tracked Action at all — there is nothing to take a
  percentage of. Archived bikes and removed or deleted components have none either (ADR 0024).
- An interval may in principle carry more than one axis. None of the 155 rows in the development
  database does, and until one exists the rule is the plain one: the percentage is the highest
  among the axes the interval fills in.
