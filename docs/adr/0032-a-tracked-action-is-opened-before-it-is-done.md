# A Tracked Action is opened before it is done

ADR 0030 made every Tracked Action row lead straight into the service wizard, on the grounds that
the reading is a job waiting to be done and the row should lead to doing it. It now opens a drawer
first, and the wizard is reached from a button inside it.

The reading is a job waiting, but it is also a plan the owner may disagree with. Three things had
no home: the Service Interval the percentage is measured against, which was seeded at the bike's
creation and could never be touched since; the postponement, which existed only as an inline link
under an overdue row; and turning the announcement off, which did not exist at all. None of them
belongs on a list row, and none of them is worth a screen. The drawer is where the reading is read
and where all three are changed, and the row leads to it whichever card it was tapped on — the
bike's own page and the dashboard's Needs Attention alike.

## One Tracked Action, and one button

The drawer carries the pairing the row carries (ADR 0027), not the part: the interval, the
postponement and the mute are all per pairing, and a part with two jobs owed on it has two rows
and two drawers. The header names the job and the part under it, because the job is what the
drawer is about and the part is which one owes it.

It shows **one** primary button, labelled by the action's `replace_action`: Log replacement, or
Log service. Two buttons — this job plus the other kind on the same part — were considered and
rejected: the second one would have to invent an action the row does not name, and the part's other
jobs already have their own rows when the bike keeps intervals for them.

The link the button builds is ADR 0030's, unchanged: `/service/new?bike&category&action&component`,
seeded on the actions step, returning to the bike on save.

## Consequences

- Recording a job is one tap further than it was, on the dashboard too — which is the shortcut
  ADR 0030 was written to build. It is spent on the three controls that had nowhere else to go.
- The inline Postpone control stays on the overdue row beside the drawer's own. The row therefore
  still holds a write and still cannot be a plain `<button>`.
- `trackedActionServiceLink` moves from the row to the drawer's button. Both cards open the same
  drawer, so `TrackedActionRow` keeps one behaviour rather than branching on where it is rendered.
- Merging the Service Tracking section with the components section into one list of parts — which
  the visual design draws — is not this decision and is not done here.
