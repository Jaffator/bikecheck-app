# A Tracked Action is a part and an action

The unit Service Tracking measures is **one mounted part paired with one action**, not an action on
a bike. A bike with two tyres owes two Tyre Replacements, and they are two separate readings with
two separate percentages, two separate postponements and two separate notifications.

## Why the bike is the wrong key

`service_snooze` was keyed `(bike_id, event_action_id)`. Under that key a bike has one Tyre
Replacement, so:

- A fresh rear tyre hides behind a worn front one, or the other way round — one reading has to
  stand for two parts, and whichever it reports is wrong about the other.
- Putting off the front tyre silences the rear one, which is the failure the owner would notice
  first and trust least.
- Replacing one tyre would have to decide what happens to a deferral granted over both.

None of those have an answer at that key. They are not edge cases; a bike has two wheels.

The table was empty and referenced by no TypeScript, so the rekey to
`(component_mounted_id, event_actions_id)` carried nothing across and cost nothing. It was renamed
to `tracked_action_state` in the same move, because the row no longer records only a snooze — it
also carries the band already announced (ADR 0026).

## What follows from the part being the key

**The state dies with the part.** `component_mounted_id` cascades, and ADR 0003 already says a
Replacement begins a new mounted component. So a new chain is born with no Extension and no
announced threshold: it gets the same warnings the old chain got, from zero, with no reset logic
written anywhere.

**An Extension is a property of one part's job.** Deferring the front tyre leaves the rear one
untouched, because they are different rows.

**Two parts of the same type are two Tracked Actions.** Not a special case in the derivation — it
falls out of iterating parts and pairing each with the actions that target its type.

## Which pairings exist

A Tracked Action exists for each pairing of an **active mounted component** with an action that

1. targets that component's type, through `event_action_targets`, and
2. has a `bike_service_interval` row for that bike.

Both conditions are load-bearing. The first is what makes a chain job say nothing about a fork. The
second keeps out of the list anything the app has no interval for and therefore no percentage to
show — an owner's own action, or a seeded one their bike type keeps no plan for.

"Active" is the part still on the bike: `is_active` true and not deleted. A part that was dismounted
or deleted is not part of the machine any more and owes it nothing, so it produces no Tracked
Action on any path.

## Considered options

**Keying on the component type rather than the mounted part** — `(bike_id, component_type_id,
action_id)` — was rejected for the same reason as the bike: it still cannot tell two tyres apart,
and it additionally survives the part, so a new tyre would inherit the old one's deferral.

**Keying on the pairing but storing it only when it has state** is what this is: no row exists until
something is deferred or announced. A Tracked Action with no row reads as zero Extension and zero
announced threshold, which is correct for one that has never been touched.

## Consequences

- `tracked_action_state` hangs off `components_mounted`, not off `bikes`. The bike relation is gone.
- Every read of a Tracked Action's state is a lookup by part and action, and every write is one
  upsert on that pair.
- The dashboard's flat cross-bike list (#70) is a list of these pairings, not of bikes or of parts.
- The notification at 95% and 100% is still one per bike per evaluation (#71) — the pairing is the
  unit of *measurement*, not the unit of *interruption*.
