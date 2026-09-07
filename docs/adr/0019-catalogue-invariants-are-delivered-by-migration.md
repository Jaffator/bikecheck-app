# Catalogue invariants are delivered by migration, not by the seed script

ADR 0018 states that every Component Type has all four actions, Replace among them, and that
every category carries a `<Category> Part Replacement` catch-all. No deployed database had one.
The nine catch-alls existed only in `scripts/seedData/seed_data.json`, and 25 of the 38 seeded
types had no Replacement covering them, so their Replace sat disabled with no way for an owner
to tell why. The gap survived for months because nothing but the running app could observe it.

The seed script was not the way out. `main_dev.ts` has every seeder commented out except a call
to one whose declaration is commented out too, so `db:devseed` cannot run at all; and once
repaired it would still abort, because `seed_actions.ts` throws on the first target it cannot
find and its `try` wraps the whole loop, so one missing Component Type silently costs the rest
of the catalogue. Even fixed, the script is something a person remembers to run against a
database they have a shell on — which production is not.

Catalogue rows that the app treats as invariants are therefore delivered by migration.
`20260906140000_seed_catchall_part_replacements` states the invariant rather than copying the
seed file: every Component Type lacking a Replacement joins its category's catch-all, and the
catch-all is created only where it is missing. Copying `seed_data.json` was rejected — its
target lists and the deployed types have drifted apart in both directions, so a faithful copy
would have left the type `Brakes` uncovered while naming `Remote Lever`, which no database has.

The rule covers owner-created types as well as seeded ones. ADR 0018 makes no exception for a
type an owner named, and the backfill in `20260906120000` cannot help them: it *looks up* the
catch-all through the types it already targets, found none, created nothing, and will not run
again.

## A category the map does not know stops the deployment

The migration maps `group_name` to action name — ids differ between environments, and three
categories name their catch-all differently from themselves. A category outside that map raises
and fails the migration.

Skipping it quietly was rejected: that is precisely the failure this ADR exists to correct, and
it would also leave owner-created types in that category with nothing to attach to, since the
create path finds the catch-all by the same shape. Inventing a catch-all from the category name
was rejected for producing an Action with no locale key, which the client renders as its raw
English name. A failed deployment is loud and, at that moment, cheap: one line added to the map.

Two further collisions stop it for the same reason. A database carrying both `Misc` and `Other`
would hang one `Other Part Replacement` off two categories, which ADR 0017 forbids; and an owner
who has already named an Action `Wheels Part Replacement` holds that name, since `action_name` is
unique across seeded and owner-created rows. Adopting their Action was rejected — it would hand
every owner of the category a row that one user can rename or delete.

Coverage is read per owner: a Replacement an owner created covers the type only for that owner,
so a seeded type stays uncovered — and gets the catch-all — even when someone has built their own
Replacement for it.

## Consequences

- The invariant is guarded in the UNIT suite by `seed_catalogue.unit.test.ts`, which reads the
  seed files alone and needs no database: every type is replaceable, every target names a type
  that exists, every category has its catch-all. Drift now fails at commit rather than on a
  bike detail months later.
- That test reads the repository, so it cannot see a database that has drifted from it. Two
  such drifts are known and left open: the type `Brakes` exists in every database and in no
  seed file, `Remote Lever` the reverse, and the category is named `Misc` in the databases and
  `Other` in the seed file. The migration maps both spellings.
- `seed_data.json` stays the catalogue's source for a database built from nothing. What changed
  is that an invariant no longer depends on someone running it.
- ADR 0017's "Each of those was given one" is corrected: they were given one in the seed file,
  which no database read.
