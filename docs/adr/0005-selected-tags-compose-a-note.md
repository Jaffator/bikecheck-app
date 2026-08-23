# Action tags are a shortcut for writing the note

ADR 0004 established that action tags describe the action, not the occasion, and are therefore never
recorded. Using the wizard showed the gap it predicted: "Fork Basic Service" lists three tags, a user
who skipped one had no way to say so, and the tags read as checkboxes someone forgot to wire up.

Every recorded action already has a free-text note — `event_actions_done.note`, reachable from both
the ordinary action and the replacement paths. We give that note a field in the wizard and turn the
tags into chips above it. Tapping a chip appends its name to the note, joined by " · ". That is all a
chip does: it holds no selected state, it can be tapped twice, and what it wrote is ordinary text the
user is free to rewrite, extend or delete. Typing the note by hand and tapping chips are the same act
by different means.

No join table, no migration, no change to the API.

The alternative was a `service_action_tags` relation, which ADR 0004 sketched. We rejected it because
nothing would query it: service intervals are defined per action, wear baselines are per component,
and the only consumer is a line of text on the service detail. A table earns its place when something
reads it as data — and a table could not hold "…and the left seal was weeping", which is the sentence
that actually helps the next person.

## Consequences

- The note is written in the language the user was working in, and never translated again. Someone
  who switches the app to English keeps reading their older services in Czech. That is how a comment
  behaves, which is what this is.
- Nothing is claimed on the user's behalf. An action recorded without touching a chip or the field
  carries no note, and the service detail then shows only the action's name and its parts — it does
  not fall back to the catalogue's tags, because those describe what the action *is* and would read
  as an account of what happened.
- Tapping a chip on an unticked action ticks it: naming part of the work is a claim the work
  happened. The note field itself stays disabled until the action is ticked, so there is exactly one
  way to record work without saying anything about it, and it is the checkbox.
- Untapping is not a thing. A chip tapped by mistake is undone by editing the text, like any other
  typo.
- Tags still influence nothing. ADR 0004 stands on every point except "nothing stores which tags
  applied": what a chip wrote is stored, as prose, indistinguishable from anything else the user
  typed.
