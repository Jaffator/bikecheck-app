# Action tags can be a user's own

ADR 0004 closed with a promise it never kept: a user who did work the catalogue does not name should
answer with "a custom action with its own tags — `events_action.user_id` and `event_action_tags`
already allow it". Half of that was true. `events_action` has the column, but nothing in the backend
ever created such a row, `event_action_tags` had no owner column at all, and there was no write path
to either. In practice the user retyped the same sentence into the note on every service.

We give `event_action_tags` a nullable `user_id`, the same shape `component_types` and `events_action`
already use: null means the row was seeded and belongs to everybody, a value means one user added it
for themselves. Two endpoints go with it — one to add a tag to a catalogue action, one to remove a tag
the caller added. Every read of the tag list filters to `user_id IS NULL OR user_id = caller`, so a
tag one user invented is never offered to another.

In the wizard this is a plus beside the tag chips, opening a drawer that names the tag and lists the
ones the user already made on that action. A tag created there is taken immediately, because a user
who just named the work meant to record it.

We chose the tag over the custom action ADR 0004 pointed at. A user doing a fork service with one
extra step wants to say so against "Fork Full Service", not to invent a parallel action that service
intervals, wear baselines and every past record would treat as unrelated work.

## Consequences

- The name is unique per owner, not globally: two users may each call a tag "Bearing check" on the
  same action. Because Postgres counts NULLs as distinct, the composite unique no longer protects the
  seeded rows, so a partial unique index over `(event_action_id, event_action_tag) WHERE user_id IS
  NULL` restores what the seeder's `skipDuplicates` relies on.
- A user's tag carries no `i18n_key` and is shown exactly as they wrote it, in whatever language they
  wrote it. That is the same rule every user-created catalogue row already follows.
- Only a tag the caller owns can be deleted. A seeded tag belongs to everybody and to nobody.
- Deleting one removes it from the chips but not from history: a Service that quoted it kept prose,
  not a reference — see ADR 0007.
- Asking to create a name the action already carries answers with the existing tag rather than a
  second one. The caller wanted the tag to exist, and it does.
- The tag is per user and per action, never per bike. Someone with three bikes names the work once.
