# A bike is archived before it can be deleted

Deleting a bike set `bikes.is_deleted` and stopped there. Nothing else read that flag, so the
bike's Rides went on filling the rides list and its Services went on counting into History Totals,
under the name of a bike the owner believed was gone. The two read paths filter on their own
`is_deleted` alone ([ride.service.ts], [bike-event.service.ts]) and never on the bike's, which is
the whole of the bug.

There are two acts here, not one, and they are now separate.

**Archiving** takes the bike out of use. It disappears from the garage, the dashboard, the ride
list, the service history, the bike picker when recording a Service, and from every total. It is
reversible and permanent in the sense that matters: nothing expires it, and the owner can leave a
bike in the archive for as long as they own the account. `bikes.is_deleted` is what carries this
state — on `bikes`, and on `bikes` only, that column means **archived**.

**Deleting** destroys the bike and everything that belongs to it: Rides, Services and their
actions and attachments, Mounted Components and their setups, service intervals and snoozes. The
foreign keys already cascade, so this is one `DELETE`. It is reachable only from the archive, and
only after the owner types the bike's name into the dialog.

## Why the archive is the first phase

The two-phase confirmation the owner asked for is a *state*, not a second screen. A misclick can
only ever archive; reaching the destructive act requires having already decided once, switched to
the archived list, and found the bike there. The server holds the same line: `deleteHard` refuses a
bike that is not archived with a 409, so the invariant survives Postman, the mobile client and any
future frontend.

The typed name is a UI guard and is not sent to the server. The server knows the bike's name
already — verifying it back would prove only that the caller can read `GET /bike/:id`.

## An archived bike is frozen

It is read-only: no services recorded against it, no components changed, no notifications, and its
snoozes are ignored. Archiving also clears `strava_gear_id`, because [strava.service.ts] resolves a
bike by that id with no regard for whether it is archived — an archived bike that kept its pairing
would go on silently collecting kilometres onto parts nobody is watching. Unarchiving does not
restore the pairing; the owner picks the gear again.

Archiving also discards the bike's unresolved `strava_pending_activities`. Left alone they fall into
the existing "unknown gear" branch and the app asks which bike the ride belongs to — a question with
no right answer, since the only bike it could name is the one just archived. The dialog says how
many are discarded before the owner agrees, so it is disclosed rather than silent. Because archiving
clears them, permanent deletion has none left to clean up.

To add a service someone forgot, the owner unarchives, records it, and archives again. Keeping the
whole wizard working over a bike that appears in no total was not worth the second meaning of
"archived".

## Archiving changes past numbers

A bike's Services stop counting the moment it is archived, so last year's spend drops by what that
bike cost. This is deliberate: the code already holds the rule that a total agrees with the list
beneath it, and a hidden bike quietly propping up a visible number is the same bug as this ADR
fixes, only inverted. The confirmation dialog says the amount out loud before the owner agrees.

## Reports are decided by whether they need the bike

A frozen Report is a document the owner has already handed to someone — typically the buyer of the
bike, minutes before deleting it. It needs nothing from the bike (`reports.bike_id` is deliberately
not a relation, ADR 0011) and it survives. The rule is not an exception carved out for Reports; it
is that **a Report dies with the bike exactly when it depends on the bike**. The live Report
planned for later reads the bike at open time, so it will hold a real relation with
`onDelete: Cascade` and go when the bike goes.

Control after deletion already exists: Reports are listed by `user_id`, and the snapshot keeps the
bike's name as text.

Exporting a Report *from* an archived bike is allowed, despite the bike being read-only. An Export
reads the bike and writes a `reports` row that belongs to the owner, not to the bike, so nothing
about the bike changes. Forbidding it would strike exactly the case the archive exists for: the bike
is sold, and the buyer wants the document. The snapshot then reflects the bike as of its archiving,
since Strava sends it nothing afterwards — which is correct, and is also why the honest order is
export first, archive second.

## Reading an archived bike

`findOwnedBike` exists four times over — a private method in the bike, bike-event, component and
report services — and every copy filters the archived bike out. Each gains an
`includeArchived` option defaulting to false, and only the read paths that serve the archive pass
true: the bike's detail, its components, its service history, its Export, `unarchive` and
`deleteHard`. Every write keeps the default, so an archived bike cannot be written to by omission.
The archived detail is served by the same `GET /bike/:id` rather than a parallel endpoint, and the
frontend derives its read-only state from `is_deleted`, which `ResponseBikeDto` already carries.

The four copies stop being four rules. The ownership-and-state condition moves into one pure
function in the bike domain — `ownedBikeWhere(bikeId, userId, { includeArchived })`, returning the
`where` object and nothing else — which all four call. Each service keeps its own `select`/`include`
and its own exception, because those genuinely differ: bike-event answers with a `Forbidden` where
the others answer `NotFound`, and each needs different columns. A plain function rather than an
injectable service, so nothing shared grows into the god-service the project forbids.

The copies had already drifted before this decision: report.service.ts matches on
`is_deleted: false`, which misses the rows written as `NULL` before the column existed, so a Report
of an old bike 404s where the other three succeed. Adding `includeArchived` to four hand-written
copies would have doubled the surface on which that happens; folding the condition into one place
fixes the existing drift as a side effect.

## Where the archive is reached

One row in Settings, opening the list of archived bikes — the pattern the custom parts row already
uses. The garage stays a plain list of cards: a segmented control there would cost vertical space on
every visit for something an owner touches twice in the life of an account, and it would put the
irreversible path one tap from the everyday screen.

The cost is discoverability, and it is paid where it is felt: the archive confirmation names where
the bike went, and an empty garage that has bikes in the archive says how many and links there. The
empty dashboard is left alone — it talks about data, not about managing bikes.

## Considered options

**Only hard deletion, no archive**, was the first decision in this session and was reversed. It
costs nothing in read-path filtering — gone rows need no filter — but it leaves an owner who wants
to stop seeing a sold bike with no move except destroying its history.

**A 30-day bin that empties itself** was rejected because it pays for every filter an archive pays
for and then adds a job that must reliably run, without which the bin fills silently. An archive is
a bin whose timer never fires, and the timer was the only part with no owner.

**Transferring a bike to another user** is the real answer to "I sold it" and is out of scope here.
Archiving keeps it possible: a sold bike's data still exists to be transferred later. When it is
built, it moves the bike, its parts and its service history but **not** its Rides — those carry the
seller's `user_id` and Strava activity ids, and handing over one's own ride log is a different
thing from handing over a bike.

**A migration for bikes already soft-deleted** was declined. They surface in the archive, where the
owner can now genuinely delete them, which they could not before.

## Consequences

- `bikes: { is_deleted: { not: true } }` has to join the filter in every read path that reaches a
  bike through a relation: rides list, service list, History Totals, the Service wizard's bike
  picker, report creation, and Strava's gear resolution.
- An archived bike's Rides leave the rides list with it. A Ride carries `user_id` and could be
  argued to belong to the rider rather than the bike, but "archived means out of the app" is one
  rule that needs no defending screen by screen — and a rider's log independent of bikes is a
  different feature, with its own screen and its own lifetime totals. In code this is a single
  `where`: the only cross-bike ride query is the list itself. `rideTotals` is scoped to one bike
  and computes wear, and must not be filtered.
- `GET /bike/` takes `archived=true|false`, defaulting to false. `POST /bike/unarchive/:id` is new.
  `delsoft` and `delhard` keep their paths and gain their real meanings.
- Files in R2 are not touched by the cascade. They are queued for deletion instead — ADR 0025.
- Archiving changes the app's numbers before any deletion happens: spend, kilometres and ride counts
  all drop. Every confirmation dialog for archiving therefore states what stops counting, where the
  bike goes, that Strava is unpaired for good, and how many pending rides are discarded.
