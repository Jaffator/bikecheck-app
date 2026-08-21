# Action tags describe the action, not the occasion

Actions in the catalogue carry tags — "Fork Full Service" lists eight, from oil change to damper
seal replacement. They are rendered in the UI both while choosing an action and when reading a
recorded service, which makes them look like checkboxes someone forgot to wire up. They are not:
nothing stores which tags applied on a given occasion, and `event_actions_done` has no relation for
them.

Tags describe what an action *is*, so they render from the catalogue and read the same for every
service that used that action. Service intervals are defined per action, never per tag, so a
recorded tag would influence nothing.

## Consequences

- A user who did only part of an action has no way to say so. The intended answer is a custom
  action with its own tags — `events_action.user_id` and `event_action_tags` already allow it.
- Should per-occasion tags ever be wanted, one join table adds them without changing anything here.
