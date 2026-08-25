# Tags are taken, then composed into the note at save

ADR 0005 made the Action Note the only state a tag chip had: tapping a chip wrote its name into the
note, and a chip was lit because `hasSegment` found that name in the text. It worked, but it cost the
user the note. The field filled itself while they worked, so anything they wrote sat interleaved with
chip output, and there was no answer to "what did I actually type here".

We split the two. `PickedAction` now holds `customNote`, which is what the user typed and nothing
else, and `selectedTags`, which is which chips are taken. Neither touches the other. `actionNote`
composes them — the custom note first, then the taken tags in catalogue order, joined by " · " — and
that composition happens in exactly two places: the Summary, which shows it, and the save path, which
sends it. What the user reads before pressing save is the string that is saved.

Still no join table, no migration, no change to the create payload. `event_actions_done.note` receives
one string as it always did, and ADR 0004 stands on every point: nothing records which tags applied,
because by the time anything is stored there are no tags left, only prose.

The alternative was to send the taken tags to the backend as data — the `service_action_tags` relation
ADR 0004 sketched and ADR 0005 rejected. Now that the tags are real state in the wizard, most of that
table's cost is already paid, so it was worth asking again. The answer did not change: nothing would
query it, and the note has to hold "…and the left seal was weeping" regardless, so the table would
buy a second way to say the same thing rather than a first way to say something new.

## Consequences

- A chip is lit by the selection, so the two directions ADR 0005 tied together come apart. Typing a
  tag's name into the custom note no longer lights its chip, and rewording a composed segment is no
  longer possible at all, because there is nothing composed to reword until save.
- A tag whose name the custom note already carries as a segment is dropped when composing, so writing
  "Full Flush" by hand and also taking the chip says it once. This is the only remaining use of
  `hasSegment`.
- The order is fixed: custom note, then tags as the catalogue lists them. Tapping a chip off and on
  again does not move it, because the selection is a set and the catalogue supplies the order.
- The note is still written in the language the app is in at the moment of saving, and never
  translated afterwards — `selectedTags` holds catalogue names and the label is resolved during
  composition, not when the chip is tapped.
- Taking a chip still ticks an unticked action, and untaking still never unticks. Naming part of the
  work is a claim the work happened; the checkbox remains the one way to record work while saying
  nothing about it.
- Deleting a tag from the catalogue cannot reach a Service that already quoted it. What that Service
  holds is prose, not a reference — the name stays, correctly, because it is a record of what was
  said at the time.
