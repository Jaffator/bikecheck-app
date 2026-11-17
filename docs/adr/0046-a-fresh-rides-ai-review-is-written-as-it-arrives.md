# A fresh ride's AI review is written as it arrives

*Status: superseded by ADR 0047, the AI Review is removed.*

ADR 0044 wrote the review on the first open, so nothing was paid for a ride nobody read. An Unassigned
Ride showed no review at all, and Save closes its drawer, so the rider rarely came back to one. The
rest of ADR 0044 stands: what Gemini may read, the pinned model, the rider's language.

**A ride that is new to the app and started under 48 hours ago gets its review as it lands, with a
Bike or without one, and the first open writes any review still missing.** The notification does not
wait for it. A review written for an Unassigned Ride names no Bike, is shown in its drawer before a
Bike is picked, and stays on the ride it becomes. A Strava update clears a review only when the
distance, riding time or climb changed.

## Considered options

- **Writing it when the rider saves the Bike**: costs nothing for a ride that is dismissed, but the
  rider leaves the drawer at that moment and would not read it.
- **Writing it when a Bike is picked, before Save**: pays again for every change of mind.
- **Holding the notification until the review is written**: an open after a tap never waits, but every
  notification waits on Gemini.
- **Writing it for old rides too**: a sync lands them through the same pipeline, and a newly connected
  account would pay for its whole backlog.

## Consequences

- Every fresh ride costs one Gemini call, including one later dismissed as not the rider's.
- The arrival write is not awaited, because the Strava queue runs one job at a time.
- The model answered 503 to about a quarter of test calls, so every review call tries up to three
  times. One that still fails leaves the review to the first open.
- An open during the arrival write asks Gemini twice; the arrival write never replaces a kept review.
- An Unassigned Ride's review lives on its pending row and is copied to the ride when it gets a Bike.
- A review written before the Bike was known keeps naming none; a move to another Bike still clears
  a review.
