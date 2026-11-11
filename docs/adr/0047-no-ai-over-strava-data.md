# No AI reads Strava data

Strava's API Policy (§5.3, §5.10) forbids using Strava Data, derived or aggregated, in any AI feature
and passing it to an AI provider. Strava rejected the athlete-capacity request (#373). This supersedes
ADR 0044 and ADR 0046.

**The AI Review is gone: no Gemini call, no `GET /rides/:id/summary`, no pending-ride review, no Review
card in the ride detail.** `GeminiService` and its module are deleted. The `summary` columns are no
longer written; #375 clears them.

**The AI chat reads no rides, distances or ride times.** `list_rides` is removed, and `get_garage` and
`list_parts` no longer carry `total_km`, `total_time_min` or climb. The prompt tells the model it cannot
see them. Wear readings (`list_tracked_actions`) stay: the owner chose to keep them, accepting that a
percentage is derived from Strava rides and Strava may read that as Strava Data. The tool also returns the raw `current`, `interval` and `remaining` (km or minutes), so those reach the model too.

## Considered options

- **Fixed-text reviews without AI**: nothing to defend, but a template reads as filler. Dropped.
- **Keeping the review for rides entered by hand**: the origin of a ride is not tracked, so every ride
  would need a flag first.
- **Keeping km in the chat as the app's own figure**: the same numbers come from Strava rides, so the
  line would be arguable at every review.
