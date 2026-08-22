# The summary is the wizard's hub, and a category is a draft until confirmed

The service wizard used to run bike → category → actions → review, with review as a dead end reached
once. Two things went wrong with it. Picking a category created its block immediately, so a category
opened by mistake appeared in the review with no work in it. And "another category" lived on the
actions step, which made the review a place the user passed through rather than the place they
worked from.

We invert it. The Summary is where the Service is assembled: date, note, total, attachments and the
list of what was done all live there, and "Another service action" starts the loop again at the
category step. Category → actions → Summary is a round trip, run as many times as the visit had
parts to it.

The category being worked on is a **draft**. It carries an `editingIndex` — null for a category
being added, the block's index when the Summary sent the user back to correct one — and reaches the
Service only when the user presses the button. An edited block confirmed with no actions left is a
block removed.

## Consequences

- Nothing half-chosen can leak into the Service. Leaving the actions step with work in the draft
  asks first; leaving it empty asks nothing, because nothing is lost.
- The Summary has no back arrow — the header hides it via `backHidden` — because there is no earlier
  step to return to. Android's hardware back still fires, and leaves the wizard after confirming.
- Back from the actions step returns to the Summary whenever the Service already has a block, and to
  the category step only on the first pass. The user who came from the Summary goes back to it.
- The per-block breadcrumb is gone. The Summary shows how many blocks there are; the actions step
  works on exactly one and only needs to name its category.
- The date moved from the actions step to the Summary. It belongs to the occasion, not to a block
  (ADR 0002), and asking for it once at the hub removed the read-only-but-openable field the old
  second block needed.
