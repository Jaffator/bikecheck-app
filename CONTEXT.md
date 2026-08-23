# BikeCheck

BikeCheck tracks bikes, the components mounted on them, and the maintenance performed on those
components. Ride data synced from Strava accumulates wear per component, which lets the app tell
the owner when a part needs attention.

## Language

### Bikes and parts

**Bike**:
A single bicycle owned by a user. Carries its own odometer (`total_km`, `total_time_min`).

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
component and begins another, even when the new part is identical.
_Avoid_: Component (ambiguous — could mean the type)

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
each tag is a chip that writes its own name into the action's note; what ends up stored is prose the
user owns, not a record of which tags were picked (ADR 0005).

**Action Note**:
What was done on one occasion, in the user's own words, against one Action. Tag chips write into it
as a shortcut; the user can rewrite it entirely. Distinct from the Service's own note, which covers
the whole occasion.

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

**Wear Baseline**:
A component's accumulators frozen at the moment of a service, so "how far since this was last
done" can be measured per action. Accumulators keep growing; the baseline is what they are
measured against.

**Service Interval**:
How much wear may pass before an action is due again — expressed in kilometres, minutes or health
index, depending on the action.
