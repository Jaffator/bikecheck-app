# A Setup is the bike's, held in named profiles rewritten in place

The schema carried `suspension_setup` and `tire_setup` hanging off `components_mounted`, with a
`setup_date` and one row appended per save. No screen or endpoint ever wrote them; only the chat's
`get_setup` read them and only the chat eval seeded them. Building the owner-facing Setup on top of
them was the obvious path, and this ADR is why it was not taken.

**A Setup belongs to the Bike, not to the part it is dialled into.** A bike keeps named Setup
Profiles — Trail, Race, Park — and each profile is one row holding every number at once: both tyre
pressures, and for the fork and the shock the pressure, tokens, sag and the four click counts.
Saving a profile rewrites that row. There is no history table behind it.

## Why the bike and not the part

Hanging the numbers on the mounted part reads well in the schema: the pressure *is* in that tyre,
the clicks *are* on that fork. It fails on the owner's side. What a rider carries in their head is
"my park setup" — one sheet for the whole machine, tuned as a whole — and a sheet split across four
part rows has nowhere to put a name, a note, or a second sheet for a different day.

It also does the wrong thing on Replacement. ADR 0003 makes a new fork a new mounted component, so
a part-keyed setup vanishes with the old fork and the rider is handed blank fields. That is
sometimes right (a different fork wants different tokens) and often wrong (the same tyre model at
the same pressure), and the app cannot tell which. Keeping the Setup on the bike means it reads as it
did and the owner corrects what actually changed.

Which sections a profile has follows the bike too — `has_front_suspension` and
`has_rear_suspension` on `bikes` — not what is mounted. A gravel bike shows tyres only; a hardtail
tyres and fork. The Setup therefore never reads `components_mounted` at all.

## Why profiles instead of history

Every save could have appended a dated record, the way the old tables did, with the newest one read
as current. It was chosen and then dropped. What the owner asked for is not "what did I run on the
1st of June" but "Trail versus Race, side by side" — two setups that are both current. History
answers the first question and not the second; profiles answer the second, and an owner who wants
the first makes a copy before changing anything. That is the single affordance carried over: a new
profile may start as a copy of another.

Rewriting in place is a real loss — a misread number is gone — and the reason the chat is only
allowed to read a Setup, never write one. A tool that overwrites a profile on a misunderstood
sentence would destroy the value with nothing to fall back on.

## Considered options

**Keep the part-keyed tables and add a bike-level grouping over them** — a profile row pointing at
per-part setup rows — was rejected as two models for one thing: the part rows would still die with
the part, so the grouping would have to be repaired on every Replacement.

**A fixed pair of profiles (Trail / Race)** costs the same as a free name and forbids Park and Wet,
which every second rider would ask for next.

**Storing the unit with each pressure** (1.8 bar here, 28 psi there) was rejected in favour of one
stored unit and one account-wide Tyre Pressure Unit: a number that carries its own unit cannot be
compared across profiles or bikes without converting on every read.

## Consequences

- `suspension_setup` and `tire_setup` are dropped in the migration that adds the profile table;
  the chat's `get_setup` and the eval seed move to profiles.
- A profile row cascades from `bikes`, so Deleting a Bike takes its setups with it, as the glossary
  already promised.
- A first profile is created lazily, on first save, under a default name; the bike "begins with
  one" as a promise of the screen, not a row written by a migration.
- Pressures are stored in psi; tyres are read in the owner's Tyre Pressure Unit, suspension always
  in psi. Clicks are counted from fully closed on every adjuster.
- Reports do not carry a Setup. A frozen Report of a rewritable profile is a feature on its own, not
  a side effect of this one.
