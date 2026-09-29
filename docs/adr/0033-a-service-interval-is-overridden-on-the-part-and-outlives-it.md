# A Service Interval is overridden on the part, and the override outlives the part

`bike_service_interval` is materialized when a bike is created, from the defaults its bike type
carries, and has never been written since. The owner who knows their chain does 2 500 km rather
than 3 000 had no way to say so, and no way to stop the app announcing a job on a schedule they
disagree with. The drawer (ADR 0032) gives them both, and neither is written where the plan lives.

**The override is keyed on the Tracked Action, not on the bike.** `bike_service_interval` is unique
on `(bike_id, event_actions_id)`, so editing it from the front tyre's drawer would silently move
the rear tyre's reading too — the failure ADR 0027 rekeyed `service_snooze` to avoid. Two tyres are
two Tracked Actions, and they are allowed two intervals.

## What the part may override, and what it may not

Only the number, never the axis. Which accumulator a reading is taken from follows the part's
type — a fork wears by the minutes it worked, a chain by the kilometres it drove under load — so a
fork moved onto kilometres would quietly start reading the bike's own total instead. The axis stays
whichever the bike's plan fills in, and the override replaces the value on that axis alone.

Clearing the override restores the bike's plan. That is what the row's "custom" badge exists to
make visible: without it, a plan and an override read the same.

## Why it outlives the part it was set on

The override lives on `tracked_action_state`, the row ADR 0027 built for what a derivation cannot
know and what dies with the part. The override must not die with it. "My chain lasts 2 500 km" is
about how this bike is ridden, not about this chain, and an owner who had to re-enter it after every
replacement would stop entering it.

So the Replacement save copies it. Every `tracked_action_state` row of the part being replaced
hands its `interval_override` and its `notify` to a row on the new part — all of the part's jobs,
not only the one the Replacement was, so a muted chain lubrication stays muted through a chain
swap. The Extension and the announced band are never copied: those are the cycle's state, and
ADR 0027's rule that a new chain is never born already deferred is untouched.

The table now holds two kinds of thing with two different lifetimes — settings that survive a
replacement, state that does not. Its name still says state; this is where that is written down.

## What muting is

`notify` false stops the announcement and nothing else. The percentage still reads, the colour
still warns, the dashboard still lists it — the app does not stop knowing the chain is finished
just because the owner stopped wanting to be told. `reached_threshold` keeps moving under a mute,
silently, so unmuting is quiet rather than a backlog of everything that happened while it was off.

The bands themselves are not the owner's to set. 70, 95 and 100 are constants shared by the
announcements and the dashboard's cutoff (ADR 0026), and a per-pairing threshold would let a row
be listed without having announced. An owner who wants to be told later raises the interval, which
is the control one row above.

## Considered options

**Writing `bike_service_interval` directly** was rejected for the two-tyre failure above.

**Keying the override on the slot** — `(bike_id, component_type_id, position, event_actions_id)` —
would survive a replacement on its own and need no copy at all, since ADR 0020 already says a slot
holds at most one part. It was rejected for the schema: the key needs nullable columns to hold a
bike-wide row alongside a slot-specific one, and Postgres does not compare NULLs the way such a key
needs without `NULLS NOT DISTINCT` and the migration that comes with it.

**Letting the override die with the part**, as the Extension does, was rejected as above: the
setting would be lost at exactly the moment the owner is not thinking about it.

## Consequences

- An Extension is 10% of the interval in force — the override where there is one — so the number on
  the Postpone row is a tenth of the number on the interval row above it. `extensionOn` reads the
  effective interval rather than the bike's plan. The rule that it is never a tenth of an already
  extended interval is unchanged.
- The response has to carry what a postponement is worth. `interval` already includes any Extension
  in force, so the client cannot derive the base from it.
- Postponing is offered at every level, not only overdue, and is still one tap with no cap. Repeated
  taps grow the interval without saying so; the honest control for that is the interval row, which
  now exists.
- `bike_service_interval` is still never written. It stays the seeded plan and the fallback, which
  keeps the Reset to default the drawer offers meaningful.
- The Replacement save gains a responsibility it can forget. ADR 0026 refused stored readings for
  that reason; the difference is that a forgotten copy loses a setting the owner can see is gone and
  set again, not a number that is silently wrong forever.
