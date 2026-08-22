# Selected action tags compose a note, they are not data

ADR 0004 established that action tags describe the action, not the occasion, and are therefore never
recorded. Using the wizard showed the gap it predicted: "Fork Basic Service" lists three tags, a user
who skipped one had no way to say so, and the tags read as checkboxes someone forgot to wire up.

We wire them up, but only as far as prose. Ticking an action selects all of its tags; the user
unticks what was left out; what remains is joined into one sentence and stored in
`event_actions_done.note` — the free-text column that already exists on both the ordinary action and
the replacement paths. No join table, no migration, no change to the API.

The alternative was the join table ADR 0004 sketched. We rejected it because nothing would query it:
service intervals are defined per action, wear baselines are per component, and the only consumer is
a line of text on the service detail. A table earns its place when something reads it as data.

## Consequences

- The sentence is composed in the language the record was written in and never translated again. A
  user who switches the app to English keeps reading their older services in Czech. That is how a
  comment behaves, which is what this is.
- Which tags were ticked cannot be recovered from the stored text. The frontend has no edit-service
  flow today; when one is built, editing an action starts from all tags ticked again, and the note
  is rewritten from that.
- Tags still influence nothing. ADR 0004 stands on every point except "nothing stores which tags
  applied": now something does, as prose rather than as a relation.
- The service detail shows the recorded note where there is one, and falls back to the catalogue's
  tags for services recorded before this — so older records read exactly as they did.
