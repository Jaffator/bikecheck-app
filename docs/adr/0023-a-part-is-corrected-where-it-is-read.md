# A part is corrected where it is read

ADR 0018 emptied the detail sheet of everything but reading. Replace, Edit, Dismount and Delete
moved onto the part's row, the footer went, and the sheet shrank to half the screen because
"readings are all it has left to show". One of the four comes back: the sheet carries **Edit**, as a
pencil beside its close button. Replace, Dismount and Delete stay on the kebab.

The split ADR 0018 drew was between reading a part and deciding what to do to it. Correcting a part
is neither — it is fixing the very numbers on screen. An owner who opens a chain, sees 1 420 km and
knows the chain went on at 900, is already looking at the mistake; sending them back to the row to
find the same part again is a step that teaches nothing. Replace and Delete are decisions about the
build, and those stay where the build is.

The sheet stays a layer, not a form: no footer, still 60vh, and the form it opens is the same
`BikeComponentFormDrawer` the kebab opens, at the z-index above the sheet that was reserved for it
from the start.

## The pencil is offered exactly where the kebab is

A dismounted part has no kebab at all — ADR 0018 calls it a record rather than a build item — so its
sheet has no pencil either. A part hardened by a Service (ADR 0016) keeps both: the drawer already
locks its wear fields and leaves the description and note editable, so the sheet offers precisely
what the row offers. Two ways in, one answer.

## The sheet holds an id, not a part

The section used to hand the sheet the part object it was opened with. Saving a correction over the
sheet would then have left the old numbers drawn underneath the drawer that had just fixed them.
The section holds the mounted component's id instead and reads the part out of the query cache, so
the tiles rewrite themselves when the write lands. A part that leaves the build — deleted, or
dismounted from under the sheet — is no longer found, and the sheet closes on its own rather than
being closed by hand at each call site.

## Readings are tiles, and a reading is shown by what feeds it

The four accumulators move out of the label/value rows into a two-column grid of tiles: a mono
label above a large mono figure, grouped for the owner's locale. Dates and the note keep the rows.

Which tiles appear is no longer "whatever is above zero". A reading is shown when something writes
it, and then from the first ride:

- **Distance** and **time** — every part, always.
- **Drivetrain distance** — Chain, Chainring, Cassette.
- **Suspension time** — Fork, Shock.
- **Wear index** — where the bike's own service intervals watch one.

Hiding a zero was the older rule, and it read as "this part does not track that" when it meant "not
yet". A fresh chain now says 0 km of drivetrain wear, which is true, instead of dropping the line
that says the wear is being counted at all.

The first two lists are the same ones `strava.service` increments against, written out a second time
on the client. The wear index is not: it is answered per bike by `bike_service_interval` — an
interval the bike carries with `health_index_interval` set names an Action, and that Action's
`event_action_targets` name the types. The server decides it and serves it as
`tracks_health_index`, the way `unserviced` is decided (ADR 0016).

## Consequences

- `bike_service_interval` is read by the app for the first time. Until now it was written when a
  bike was created and never looked at again.
- A bike created without a bike type copies no intervals at all, and so shows no wear index on any
  part. That is the same silence the warning in `bike.service` already logs.
- The wear index tile and the sync can disagree. The sync adds a wear index to `Brake pad` and to
  nothing else, so a bike whose interval targets another type shows a tile that stays at zero
  forever. Reconciling the two is a catalogue question, not one this decision settles.
- The drivetrain and suspension lists now exist in two places, backend and frontend. Moving them
  onto `component_types` as flags would settle that; it was left out of this change deliberately.
- The form drawer grows a **Cancel** beside Save, in both the add and the edit case, discarding
  without a confirmation — which is what the overlay and the Android back gesture already do.
