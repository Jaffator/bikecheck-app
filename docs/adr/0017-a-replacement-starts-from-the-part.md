# A replacement starts from the part, and finishes in the wizard

ADR 0015 kept the bike detail's components section free of maintenance, and rejected two ways of
offering a replacement there: performing it in the section, and a shortcut into the service wizard
prefilled with the bike and the category. The second of those is now offered. Tapping a part opens
its detail sheet, and the sheet's first action is Replace, which leaves for
`/service/new?bike=3&category=2&action=17&component=42` — the actions step, with the Replacement
ticked and the part already picked.

The rule ADR 0015 was written to protect is untouched: the section still writes no replacement. The
old part is dismounted and the new one created by the same wizard save as before, so every
Replacement carries a Service, appears in the history, reaches every Report, and gets its wear
rewound to the service date (ADR 0001). What changed is only where the wizard is entered from.

ADR 0015 rejected the shortcut on the grounds that the action tiles already reach the wizard from
the same screen, so a second door buys nothing but a second thing to keep working. That held while
the section was a flat list of parts. It stopped holding once a part got a detail sheet: the sheet
is where an owner reads that this chain has done 1 240 km and was last serviced in July, and
sending them from there to the tiles — to pick the bike's category and find the same part in a list
of candidates — makes them re-enter what the app already knows.

## Every category needs something to prefill

The shortcut needs a Replacement that names the part, and 25 of the catalogue's 38 component types
had none — Fork, Shock, Frame, Rim, Seatpost, Stem, Pedals, Brake Rotor, Bottom Bracket, Hanger,
Motor, Battery and the rest. Each of those was given one, as a per-category catch-all named
`<Category> Part Replacement` and translated to a plain "Part replacement" in both languages.

One named action per type — `Fork Replacement`, `Stem Replacement`, and so on — reads more
precisely in a history, and was rejected for what it does to the wizard: Drivetrain alone would
have carried ten replacement actions, and the action step would repeat the problem the folded
category cards were built to solve. The recorded Action names the parts it was performed on, so
"Part replacement · Derailleur" loses nothing a reader needs.

The action's category is not stored; it is derived from its targets' component group. A catch-all
is therefore one row per category rather than one row shared between them — `action_name` is
unique, and an action targeting types in two groups would offer parts from one group as candidates
in the other.

## Consequences

- The components section keeps its four writes — create, correct, dismount, delete. Replacing is
  still not one of them, and no Wear Baseline is read or written here.
- Saving a Service entered with `?bike=` now returns to that bike's detail rather than to the
  service list, so the owner watches the new part appear in the build. The action tiles get this
  too; they had been dropping the owner on the service list since they were built.
- The wizard seeds its block from the catalogue the detail sheet had already fetched to find the
  Action, read straight out of the query cache as the wizard is created. A link opened cold — a
  reload, or a pasted URL — finds no catalogue and starts at the category step with the bike
  chosen, which is where the tiles land too.
- `Battery Swap` is `replace_action` and targets Derailleur and Shifter, so those two count as
  covered and their Replace opens an AXS battery swap. That is a seeding question, not one this
  decision settles.
