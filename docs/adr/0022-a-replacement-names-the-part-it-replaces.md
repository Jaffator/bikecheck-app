# A Replacement names the part it replaces

ADR 0017 gave 25 of the catalogue's 38 Component Types a shared `<Category> Part Replacement`, and
rejected the alternative — one named Replacement per type — on the grounds that Drivetrain alone
would carry ten of them and the action step would repeat the problem the folded category cards were
built to solve. We now do what it rejected. Every Component Type owns exactly one Replacement:
`Fork Replacement`, `Rim Replacement`, `Bottom Bracket Replacement`. The catch-alls stay, serving
owner-created types alone.

The count that killed it never existed. The action step is filtered to work the bike can receive —
an Action whose target type is not mounted is never returned — so Drivetrain shows one Replacement
per mounted drivetrain part, which on a bike carrying only its essential parts is seven, not ten.
Brakes and Cockpit are four, Suspension two.

What the catch-all cost instead was a choice inside every row. Picking `Part replacement` opened a
list of the category's mounted parts to pick the real subject from — a step the app could already
have taken, because the owner had said which part they meant by opening that row at all. With one
Replacement per type the row *is* the part, and the picker inside it has nothing left to ask.

## The wizard was not the only way

The same reading — one row per part rather than one row with a picker — could have been done in the
wizard alone, leaving the nine catch-alls to carry every type and expanding each into one row per
candidate at render time. That is much the cheaper change: no migration, no new locale strings, and
the save path already writes one replacement per component, so nothing behind the wizard would have
noticed.

It was rejected for what it leaves in the history. A service recorded that way still reads
"Part replacement · Fork" in the service detail and in every Report, because the stored Action is
still the catch-all. The catalogue is where the name comes from, so the catalogue is where the fix
belongs.

## Four actions that were never Replacements

Splitting the catalogue surfaced a bug it then had to settle. `replace_action` drives
`writeReplacements`, which ends a Mounted Component and begins a new one (ADR 0003). Four seeded
Actions carried the flag while replacing something that is not a tracked Component Type:

- `Brake Hose Replacement` — a hose, borrowing Brake Caliper and Brake Lever
- `Battery Swap` — an AXS cell, borrowing Derailleur and Shifter
- `Hub Bearing Replacement` — bearings, borrowing Hub
- `Headset Bearing Replacement` — bearings, borrowing Headset

Each of them ended a part that never left the bike. Replacing hub bearings zeroed the hub's wear;
swapping an AXS battery zeroed the derailleur's. All four become ordinary Actions, which freeze a
Wear Baseline instead — so "how far since the hub bearings" starts working, and the six bearing-size
tags on `Hub Bearing Replacement` finally sit on a job rather than on a swap.

This also left Derailleur, Shifter, Brake Caliper, Hub and Headset with no honest Replacement at
all, which the split provides. ADR 0018 had noticed the `Battery Swap` case and left it as "a
seeding question, not one this decision settles"; it is settled here.

The fix is forward-only. ADR 0001 refuses to un-replace, and the new part may already carry rides of
its own, so a hub dismounted by a past bearing job stays dismounted.

## The catch-alls keep their category

Minting an Action for each owner-created Component Type was rejected. `component_types` is unique on
`[component_type, user_id]`, so two owners may each name a type "Tensioner", while
`events_action.action_name` is unique globally — the second owner's mint would collide. Nothing in
the app creates a user-owned Action today, and this was not the change to make it the first.

Owner-created types therefore keep joining their category's catch-all, exactly as ADR 0018 arranged.
That is one corner where the inconsistency this ADR removes survives: a seeded part offers
`Fork Replacement`, a part the owner named offers `Part replacement`.

Keeping them meant giving them somewhere to keep their category. ADR 0017 stored it nowhere and
derived it from the targets' component group, which worked only while a catch-all had targets. Now
that the seeded ones are gone, a catch-all serving a category with no owner-created type yet has
none at all, and could not be found to attach the first one to. `events_action.component_group_id`
holds it instead, set on those nine rows and null everywhere else. Deriving it at read time was not
an option; resolving a category against an Action with no targets has nothing to resolve.

## Consequences

- Every Component Type has **exactly one** Replacement — 8 kept, 30 delivered by migration.
  `seed_catalogue.unit.test.ts` enforces exactly one rather than ADR 0018's at least one, so
  re-flagging a demoted Action fails at commit time.
- The action step keeps both groups flat. Collapsing Replacements behind a disclosure was rejected
  for costing a tap on the flow ADR 0018 made the headline, and for having to reopen itself whenever
  the Replace deep-link seeds a row inside it.
- A Replacement with one candidate part renders no picker; `toggleAction` already ticked it. A
  positioned type mounted front and rear still asks, which is 12 of the 38 types on a full build.
  The ADR 0017 URL contract is unchanged.
- Past replacements are repointed at the Replacement that names their part, read through the one
  component each `event_actions_done` row maps to. Rows on an owner-created type keep the catch-all,
  and the four demoted Actions keep their history: a Battery Swap was a battery swap, and calling it
  a Derailleur Replacement afterwards would claim a part was changed that was not.
- Published Reports are untouched, because `reports.snapshot` resolves Action names to text at export
  (ADR 0011).
- `bike_service_interval` and `service_snooze` rows an owner set on a catch-all stay pointing at it.
  They carry bike and action but no component, so there is nothing to say which of the category's
  parts they meant. Fanning one row out across four parts would invent intervals nobody set, and
  deleting them would throw away something typed in by hand. They stop matching anything until that
  bike mounts an owner-created part in the category, at which point they quietly apply to it.
- `Hanger Replacement` already existed as ordinary work and is promoted rather than duplicated. A
  hanger is a tracked type, and swapping one really does end a Mounted Component.
- The misspelled `Grip Replecament` becomes `Grips Replacement`. The i18n key is derived from the
  English name, so it moves with it.
- `Battery Swap` reads as "AXS battery swap" rather than "Battery replacement", which the new
  `Battery Replacement` on the e-bike Battery type now needs.
