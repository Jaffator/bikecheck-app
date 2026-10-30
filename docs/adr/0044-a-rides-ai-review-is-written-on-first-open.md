# A ride's AI review is written when it is first opened

Every ride saved from Strava used to queue a Gemini job (`gemini-queue`) that wrote `rides.summary`,
a few casual sentences with a star rating. Nothing showed it, so every new ride and every re-sync
paid for text nobody read (#308). **The review is now written when the rider first opens the ride's
detail (`GET /rides/:id/summary`), kept on the ride, and shown below its figures.** A Strava re-sync
or a move to another bike clears it, and the next open writes it again. It is free on every plan.

Gemini gets an allowlist and nothing else: the figures from the ride's row, its name, sport type and
power from Strava's payload, and the bike as the app names it. No position, route, notes, heart rate
or athlete leaves the server. The model is pinned (`gemini-3.5-flash-lite`), and the review is
written in the rider's language.

## Considered options

- **Writing it as each ride is saved**, as before: ready on the first open, but every ride pays,
  including the ones nobody opens, every re-sync, and the backlog a newly connected Strava account
  brings in.
- **Leaving it out of the app**: the cheapest, but the review was always meant to be read
  (`docs/design.md`).
- **Writing it from the wear the ride put on the bike's parts**: advice that agrees with the app,
  but a different feature. The review stays a light comment on the ride.

## Consequences

- The first open of a ride waits a few seconds for Gemini, behind a skeleton.
- When Gemini fails, the route answers 502 and the detail leaves the section out; the next open asks
  again.
- The route is throttled to 10 a minute, like the report PDF.
- `gemini-queue` and its processor are gone: nothing about a ride reaches Gemini until it is opened.
- A review is not rewritten when the rider switches language or renames the bike.
