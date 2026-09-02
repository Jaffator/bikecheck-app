# BikeCheck

BikeCheck tracks bikes, the components mounted on them, and the maintenance performed on those
components. Ride data synced from Strava accumulates wear per component, which lets the app tell
the owner when a part needs attention.

## Language

### Bikes and parts

**Bike**:
A single bicycle owned by a user. Carries its own odometer (`total_km`, `total_time_min`).

**Bike Weight**:
What the bike itself weighs, typed in by its owner and shown on the bike's detail. Never measured
or derived — a bike with no weight on record shows a dash rather than a zero.
_Avoid_: Weight on its own (ambiguous — see Rider Weight)

**Rider Weight**:
What the rider weighs, held on the user and fed into the wear calculation. A different number from
Bike Weight, living on a different row, and the two are never read for one another.
_Avoid_: Weight on its own

**Total Elevation**:
How much a Bike has climbed, accumulated from rides as they arrive. Joins the odometer as a reading
the Bike carries rather than one its components do. Not backfilled (ADR 0014), so a Bike ridden
before the reading existed reads lower than it has truly climbed.
_Avoid_: Elevation gain, ascent

**Component Type**:
A kind of part that can be mounted on a bike — Chain, Fork, Brake Caliper. A catalogue entry,
not a physical object.
_Avoid_: Part type

**Component Category**:
The grouping a component type belongs to — Drivetrain, Brakes, Suspension. The first thing a user
picks when recording a service.
_Avoid_: Group, component group

**Mounted Component**:
One physical part on one bike, with its own wear accumulators. Replacing a part ends one mounted
component and begins another, even when the new part is identical. Named by its Component Type while
work is being recorded — the user is looking for the fork — and in full, type and description
together, when a Service is read back.
_Avoid_: Component (ambiguous — could mean the type)

**Unserviced Component**:
A Mounted Component no Service has yet recorded work against. Its readings may still be corrected
and the row deleted outright, because nothing has frozen a Wear Baseline against it. The first
Service to touch it settles it (ADR 0016): from then on the part can only be dismounted, never
deleted or rewritten.
_Avoid_: Draft component (Draft already means the wizard's Draft Block), new component

**Dismount**:
Taking a part off a bike while keeping everything it did. The Mounted Component stops accumulating
and leaves the build, and its wear history stays readable against the bike it served. What a
Replacement does to the old part (ADR 0003), and what an owner does by hand when a part comes off
with nothing fitted in its place. Distinct from deleting a Mounted Component, which is only offered
while it is still Unserviced. The schema calls the moment `removed_at`.
_Avoid_: Remove (that is deleting a row that should never have existed), retire (a dismounted part
may be fitted to another bike)

### Maintenance

**Service**:
One maintenance occasion on one bike — a workshop visit or an evening in the garage. Carries the
date it happened, a note, a total cost and any attachments. The unit a user thinks in: one visit,
one receipt.
_Avoid_: Event, bike event, service event. The database calls the parent row `events_bikes` and its
line items `event_actions_done`, so "event" in conversation means the opposite of what it means in
the schema.

**Action**:
One item of work within a service — Chain Replacement, Bleed, Fork Full Service. Drawn from a
catalogue that knows which component types each action applies to.
_Avoid_: Task, job, event

**Action Tag**:
A sub-item describing what an action includes — "Dust seals replacement", "Piston Lube". Describes
the action itself, so it is catalogue data and is never stored per service (ADR 0004). In the wizard
each tag is a chip the user takes or gives back; what is taken joins the Custom Note to make the
Action Note when the Service is saved (ADR 0007). Most tags are seeded, but a user can add tags of
their own to any action, which only they are offered and only they can delete (ADR 0008).

**Custom Note**:
What the user typed against one Action, and only that — nothing is written here on their behalf.
Lives in the wizard alone: it is never stored, because saving composes it into the Action Note.

**Action Note**:
What was done on one occasion, against one Action — the Custom Note followed by the tags taken,
joined into one piece of prose when the Service is saved. Once stored, what a tag contributed is
indistinguishable from what was typed. Distinct from the Service's own note, which covers the whole
occasion.

**Replacement**:
An action that swaps a part out. Ends the old mounted component and begins a new one; it is not an
edit of the existing part.

**Service Date**:
When the work actually happened, which may be earlier than when it was recorded.
_Avoid_: Created at (that is when the record was written)

**Category Block**:
The Actions recorded against one Component Category within one Service. A wizard-only grouping —
nothing in the schema represents it, and every block's actions land in the same Service (ADR 0002).
_Avoid_: Sub-service, service part

**Draft Block**:
The Category Block being worked on, which reaches the Service only when the user confirms it. Either
a category being added or one the Summary sent the user back to correct (ADR 0006).

**Summary**:
The step where a Service is assembled and saved — its date, note, total cost, attachments and the
list of Category Blocks. The wizard's hub: the only way on, and the place another Action is added
from (ADR 0006).
_Avoid_: Review (it is where work is added, not only checked)

**Month Group**:
The Services sharing a calendar month of their Service Date — the division the full history
reads in. A view-only grouping; nothing in the schema represents it, and a Service with no
Service Date belongs to no month.
_Avoid_: Period, section

**History Totals**:
What the service history currently on screen adds up to — total spend, how many Services, and
how many Replacements. Always read under the filter the list itself runs on: one bike or all of
them, one Period or all time.
_Avoid_: Summary (that is the wizard's hub step), Overview

**Period**:
The span of Service Dates the history is read for. Either end may be left open; both open is
all time, which is the only Period that counts a Service carrying no Service Date — such a
Service falls in no bounded Period.
_Avoid_: Range, timeframe

**Wear Baseline**:
A component's accumulators frozen at the moment of a service, so "how far since this was last
done" can be measured per action. Accumulators keep growing; the baseline is what they are
measured against.

**Service Interval**:
How much wear may pass before an action is due again — expressed in kilometres, minutes or health
index, depending on the action.

### Sharing

**Report**:
A frozen document made from what the owner selected, shared outside the app. Its contents never
change after it is made — the Services it was built from may be edited or deleted afterwards, and
the Report still reads as it did the day it was made. Comes in three kinds: Service Report, Period
Report and BikeCheck.
_Avoid_: Export (that is the act, not the thing), snapshot, share

**Service Report**:
A Report covering one Service — the doc a workshop or a warranty claim asks for.

**Period Report**:
A Report covering the Services of one Bike within one Period, with their History Totals. May also
carry the bike's mounted components with their wear and last service, at the owner's choice.
_Avoid_: History report, multiple report

**BikeCheck**:
A Report describing a Bike and everything mounted on it — the machine's card, not its maintenance.
A different document from the Service and Period Reports, which describe work rather than the bike.

**Export**:
The act of making a Report: choosing what it covers, reading it back and creating it. What the
owner does; a Report is what results.

**Share Link**:
The public address a Report is read at. A Report has one from birth, but it stays closed until the
owner publishes it, and the owner can revoke it afterwards — a revoked link is gone for good, and a
new one means a new Report.
_Avoid_: Public URL, share url, token
