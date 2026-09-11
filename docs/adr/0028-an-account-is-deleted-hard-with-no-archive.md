# An account is deleted hard, with no archive

Apple and Google both require an account to be deletable from inside the app; without it the build
does not pass review. There was no endpoint and no screen. `users.is_deleted` and `users.deleted_at`
sat in the schema, written by nothing and read by nothing.

**Deleting an Account destroys the `users` row.** One `DELETE`, no flag, no archive, no grace
period. The bikes, the rides, the services, the parts, the reports, the chat thread, the device
tokens and the refresh tokens go with it.

## Why this departs from ADR 0024

ADR 0024 says a Bike is archived before it can be deleted, and that rule is right *for a bike*. The
archive is a useful intermediate state there: the owner sold the bike and wants it out of the garage
and out of the totals, while its history stays readable and the deletion stays optional. Two acts,
because there are genuinely two things an owner wants.

An account has no second thing. "Archive my account" is a state nobody asks for, and the one thing
someone who asks to be deleted actually means is that their personal data stops existing. An
archived account would leave the email, the name, the rides and the whole service history sitting in
the database after the request that was supposed to remove them — the appearance of deletion with
none of it. So the phased shape is not carried over.

The precedent is the chat thread (ADR-less, `20260909120000_chat_thread`), which is deleted hard for
the same reason: nothing references a message, and "delete my chat" has to mean deleted.

## The ceremony is kept, the phase is dropped

What ADR 0024 gets right and this keeps is that an irreversible act is typed out, not tapped. The
bike asks for its name; the account asks for its email. Same guard, same reason: a misread row and a
mistimed thumb should not be able to reach it.

The typed email is a UI guard and is never sent. The server knows whose session this is — verifying
the address back would prove only that the caller can read their own profile.

What replaces the archive as the first phase is disclosure. The sheet counts what is about to go —
bikes including the archived ones, rides, services, and the Share Links that still answer — and
reads those numbers out before the field is even offered. The owner decides against a number, not
against a warning.

## Reports fall with the account

`reports.user_id` already cascades, so every Report goes and every Share Link 404s, including one
already handed to the buyer of a bike. ADR 0024 deliberately spared Reports from a bike's deletion,
because a Report depends on the owner rather than on the bike. Deleting the owner removes exactly
what that exception rested on, so the same rule points the other way here: a Report dies with the
account because it *is* the account's.

Losing a link somebody was sent is a real cost, and it is the one GDPR asks us to pay.

## The cascade is not left to decide its own order

Every relation on `users` now cascades — `bikes_user_id_fkey` was the one that did not, and it is
the reason the delete would have failed. But cascading from `users` alone is not enough, because two
paths reach the same rows: a rider's own component types and their own actions hang straight off
`users`, while the parts and services naming them hang off `bikes`. `components_mounted →
component_types` is `ON DELETE RESTRICT`, so if Postgres fires the `component_types` cascade before
the `bikes` one, the delete aborts on parts that were about to be deleted anyway.

Nothing in the application chooses that order. So `deleteAccount` empties the bikes itself, inside
the transaction, before deleting the row — after which there is no order left to get wrong. The FK
still cascades, so a delete issued straight against the database also succeeds; the explicit step is
what makes it succeed *every* time.

`strava_pending_activities` carries a `user_id` with no foreign key behind it, so no cascade would
ever reach it. It is deleted in the same transaction rather than left as the rider's data outliving
the rider.

## The session cannot survive the account

The access token is a stateless JWT and the strategy never reads the `users` table, so a token
issued minutes ago still verifies against an account that no longer exists. `DELETE /users/me`
therefore clears both auth cookies in the same response that destroys the row, and the client drops
the query cache and lands on the login screen — the same drop as logging out, since there is nothing
left to come back to.

## Considered options

**A soft delete with a purge job** — flag now, remove after thirty days — was rejected for the same
reason ADR 0024 rejected the self-emptying bin, plus a worse one: the timer is the whole feature, and
until it fires the data the user asked us to delete is still there. It also needs every read path in
the app to start filtering on the user's own flag, which is precisely the bug ADR 0024 was written
to fix, one level up.

**Anonymising the row instead of deleting it** — blanking the email and name, keeping the rides —
keeps aggregate data at the cost of leaving a row that is still, in practice, one join from being
re-identified by its Strava athlete id and its ride log. Nothing in the app wants that aggregate.

**Keeping `users.is_deleted` in place, unused,** was rejected because a column that means nothing
still teaches: the next person to read the schema concludes an account can be archived and writes
code on that belief. The migration drops both columns.

## Consequences

- `DELETE /users/me` and `GET /users/me/deletion-summary`, both behind the global `JwtAuthGuard`.
  There is no id to pass, so there is no other account to aim at.
- `bikes_user_id_fkey` becomes `ON DELETE CASCADE`. No relation on `users` is left non-cascading.
- `users.is_deleted` and `users.deleted_at` are dropped. `bikes.is_deleted` is untouched and still
  means *archived* (ADR 0024).
- Files in R2 are orphaned by an account deletion exactly as they are by a bike deletion. Same
  debt, same answer: ADR 0025's queue drains them once it is built.
- A Share Link the owner handed out stops answering. Nothing warns the recipient; the sheet warns
  the owner, before the fact.
