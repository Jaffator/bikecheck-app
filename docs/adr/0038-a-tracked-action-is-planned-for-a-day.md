# A Tracked Action is planned for a day

The owner often knows when the work will be done: the chain goes on Saturday, the fork goes to the
shop on 4 October. A Tracked Action said how far the part had come, never when the owner meant to
do it, and Needs attention went on saying "91 %" about work that was already booked. The only
"not now" the app had was Postpone, which hid the Tracked Action and said nothing about when
(PRD #179).

**A Tracked Action is planned for a day.** The Plan is a date and nothing else, one per Tracked
Action, today or later when it is set.

## The plan puts nothing off

ADR 0034 removed the Extension because it lengthened the interval and made the percentage lie. A
Plan touches no interval, so the reading is the same with or without one. It hides nothing either: a
planned Tracked Action stays in Needs attention, on the bike's page and in the Planned card, with
its day beside it. Bands move and announce at 75, 90, 100 and every ten above exactly as before —
planning never makes the app go quiet about a worn part, and planning sends nothing on its own.

## A Service ends it, and nothing clears it by hand

`tracked_action_state` gains `planned_for` (a day) and `planned_at` (when it was set). The day is
served only while the plan is **live**: it ends once a non-deleted Service records this Action on
this part with a Service Date on a later UTC day than `planned_at`, or on the same day and written
after it — the Wear Baseline's own "day, then write time" tie-break. A Service with no date ends
nothing.

Liveness is worked out on read from the recordings the reading already loads (ADR 0026). No
Service write path touches the plan, so deleting the Service or moving its date moves the answer
with it, and doing the work early counts while back-filling old work does not cancel a booking. An
ended plan's day stays in the row, unserved, until the next plan overwrites it.

A Plan is cycle state, like the announced band: the Replacement's copy (ADR 0033) carries only the
Interval Override and the mute, so a new chain is never born already booked. A plan whose day has
passed stays, in the warning colour, until the Action is recorded, the plan is moved or removed.
Nothing runs on a clock to expire it.

## Postpone goes

Postpone by band came back on 23 September (`postponed_band`), a day after ADR 0034, with no ADR of
its own. It hid a Tracked Action from Needs attention until the reading reached the next band —
hiding a part that was still wearing, and saying nothing about when the work would happen. It is
removed: the endpoint, the request, the phone button and the column. The garage list filters by
percentage only, so every Tracked Action postponed before this lists again. No postponement is
converted into a plan: a band says nothing about a day.

## Considered options

**A reminder on the planned day** was rejected: it would be a push caused by a date, not by wear,
and it would need a clock (ADR 0026).

**Silencing announcements while a Tracked Action is planned** was rejected for the reason ADR 0034
gave for the Extension: going quiet about a part still on the bike is the app deciding the owner
stopped caring.

**Clearing the plan inside the Service save** was rejected: a deleted or re-dated Service would
then have to restore it, which is exactly the class of write-path bug ADR 0026 refuses.

## Consequences

- `POST /service-tracking/plan` sets or clears the day and answers with the Tracked Action; it
  runs no evaluation. `POST /service-tracking/postpone` is gone.
- Every Tracked Action response carries `planned_for` (`YYYY-MM-DD` or null); `planned_at` is
  never served.
- The Service page gains a Planned card, soonest first, read from the garage list at 0 %. A
  planned Tracked Action may show twice there — in Planned by day and in Needs attention by wear.
- Days compare in UTC. A plan made just after local midnight in Prague is stamped with the day
  before; a Service dated on that UTC day and written later still ends it, so this is harmless.
