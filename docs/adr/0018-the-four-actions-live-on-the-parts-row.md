# The four actions live on the part's row, and every part has all four

ADR 0017 put the actions in the part's detail sheet, with Replace as its first and loudest. They
move out of the sheet onto the row itself: the chevron becomes a kebab, and its menu carries
Replace, Edit, Dismount and Delete in that order. The rest of the row still opens the sheet, which
now only reads — no footer, and half the screen rather than 85vh, because readings are all it has
left to show.

The sheet had grown two jobs. Reading what a part has done and deciding what to do to it are
separate moments, and folding them together meant a part could not be glanced at without loading
the catalogue behind Replace, nor acted on without first opening a sheet and scrolling past its
numbers. Splitting them puts every write one tap from the build, where the owner already is.

## All four, always, and the same four everywhere

The menu is fixed. A part that cannot be deleted still shows Delete, disabled, with a line saying
why — ADR 0016 refuses to delete a part a Service has touched, and a button that vanishes teaches
the owner nothing. A part that has been dismounted is the exception that proves the rule: it has no
kebab at all, because it is a record rather than a build item, and Replace, Dismount and Delete are
all meaningless against it.

Replace was the other conditional one, absent when the catalogue had nothing that fit. That could
only happen for a Component Type the owner named themselves: those carry no `event_action_targets`
row, and both the wizard and the menu find an Action only through that table. Creating a custom
type now writes the row too, pointing it at its category's `<Category> Part Replacement` catch-all,
and a migration backfills the types created before this. Every one of the nine categories has such
a catch-all, so nothing is left uncovered.

Resolving the Action at read time instead — letting the endpoint fold the catch-all in for any type
in the group — was rejected. The same target rows are read when a Service is saved and when
intervals are computed, so an Action conjured for the picker would be one the save does not
recognise. Repairing the row lazily inside the GET was rejected for writing during a read.

## Consequences

- The row stops being a single tap target. The text is the button and the kebab is its sibling; a
  button inside a button is not valid, and the sheet's touch area shrinks by the kebab's width.
- The sheet no longer fetches the category's actions, so the wizard's synchronous seed
  (ADR 0017) would find an empty cache. The unrolled category card fetches them instead — one
  request per open category, made exactly when its rows come into view.
- The components section still writes no Replacement. Its four writes are unchanged (ADR 0015);
  only where they are reached from has moved.
- Two rows that look alike still offer different things, as ADR 0016 requires. The difference is
  now a disabled item with a reason rather than a missing one.
