# A Tracked Action is a part and an action, not an action on a bike

Service Tracking measures one mounted component paired with one action: this chain and its
replacement, this fork and its service. Not the bike and the action.

The data already reads this way. Accumulators live on `components_mounted` — a row per part, ended
and replaced when the part is (ADR 0003) — and a Wear Baseline is frozen per *pair* in
`action_done_component_map`, whose primary key is exactly `(event_action_done_id,
component_mounted_id)`. Only the Service Interval is held per bike, and that is a plan the bike
carries, not a measurement.

The alternative — one row per action on the bike, since that is where the interval lives — breaks
on the first bike with two of the same kind of part. A bike has two tyres and two brake pads.
"Tyre replacement is at 96%" is not a fact about a bike; it is a fact about one of its tyres, and
folding the pair back into an action would mean choosing the worse one and then having no way to
say which one the owner is looking at, or to record work on it alone.

## Snoozes are rekeyed

`service_snooze` was written the other way: `@@unique([bike_id, event_action_id])`, with
`extended_by_km`, `extended_by_min` and `extended_by_healthIndex`. The table is referenced by no
TypeScript in the repository and holds no rows in the development database, so it is a design that
was never exercised.

It is rekeyed to `(component_mounted_id, event_actions_id)` and becomes the state of a Tracked
Action, holding the Extension **and** `reached_threshold` (ADR 0026) in one row. One row per
Tracked Action, one write to reset it.

Rekeying does more than fix the two-tyres case. An Extension granted on a chain is about that
chain, and when the chain is replaced a new `components_mounted` row begins — so the old state row
goes with the old part through the existing cascade, with no cleanup code and no way for a snooze
to outlive the thing it was granted on. Keyed by bike, an Extension would silently apply to the
next chain the owner fits.

Putting off an action adds a fixed 10% of the Service Interval to the axis the interval is measured
in, on one tap. No dialog: an owner who is riding an overdue chain is not choosing between 400 and
600 kilometres, they are saying "not now". Repeated postponements add up in the same row, so the
choice is visible as a growing Extension rather than hidden as a cleared flag.

## Consequences

- A migration adds `component_mounted_id` to `service_snooze`, drops `bike_id`, and moves the
  unique key. No data is carried across; the table is empty.
- The Extension is added to the interval, never subtracted from the progress. A part that has been
  put off twice reads against a longer interval, and its history still says how far it has actually
  gone.
- Bikes stay in the picture only through the interval: reading a Tracked Action means joining the
  part to its bike's `bike_service_interval` row for that action.
- The four Attention Levels — good below 80%, warning to 94%, critical to 99%, overdue at 100% and
  above — are properties of a Tracked Action. A bike's badge is the worst level among them, which
  is the existing `overallLevel` over readings the API now fills in for real.
