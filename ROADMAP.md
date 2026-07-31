# Roadmap

Feature backlog and gap analysis. Nothing here is committed work — it is a survey of what
the app is missing, kept so we can pull items into PRDs later.

For features that are already decided and specified, see [FUTURE_FEATURES.md](FUTURE_FEATURES.md).

_Last surveyed: 2026-07-31._

---

## The main gap: backend is ahead of frontend

Backend domains that exist in `_backend/apps/monolith/src` — `bike`, `component`, `bike-event`,
`strava` (plus a separate `strava-service` for webhooks), `notification`, `report`, `storage`,
`gemini`, `organization` — have little or no UI. Most frontend feature folders are still
placeholder cards.

**The cheapest new features are not new.** They are the screens for endpoints that already work.

| Backend domain | Missing in UI |
| -------------- | ------------- |
| `report` | Generate a shareable report, list and revoke existing links (spec already in FUTURE_FEATURES.md) |
| `gemini` | No AI entry point anywhere in the app |
| `storage` | Bike and component photos, attachments on service events |
| `organization` | Bike shop / mechanic mode, roles, inviting a mechanic |
| `bike-event` | Logging a completed action, browsing service history |

Do this before anything below.

---

## Table stakes

Expected in a modern mobile app, verified absent from `_frontend/bikecheck/src`.

### High impact

- **Onboarding** — adding the first bike is the whole value proposition; without a guided flow
  users drop out before reaching it.
- **Skeletons and empty states** — today a bare `<Loader />` and blank screens.
- **Error boundary** — a single throw in a component currently yields a white screen.
- **Offline mutations + optimistic updates** — react-query and network detection are wired, but
  offline only swaps in `OfflinePage`. Logging service in a garage with no signal fails.
- **i18n** — app is English-only; the primary market is Czech.

### Lower effort, still missing

- **Haptics** — `@capacitor/haptics` is a dependency but is not referenced anywhere.
- **Deep links / Android App Links** — a shared report must open in the app, not the browser.
- **Crash reporting + product analytics** (e.g. Sentry, PostHog) — no visibility into where users
  fail or drop off.
- **Pull-to-refresh**, **search across bikes and components**, **biometric unlock**.

---

## Product features worth considering

Ordered by how much they differentiate the app, not by effort.

- **AI component recognition** — photograph a derailleur, get type / brand / model pre-filled.
  The `gemini` backend module already exists and has no consumer; this is its obvious use.
- **Predictive service intervals** — derive wear from ride weather and terrain instead of a flat
  "3000 km per chain". The `rides` data needed for this is already stored.
- **Cost / total cost of ownership** — spend per season, cost per kilometer. Derivable from
  `event_actions_done`.
- **QR code on the frame** → opens the public BikeCheck. Cheap, demos well, builds on `reports`.
- **Garmin / Wahoo integration** alongside Strava — `strava-service` is already a separate app,
  so a second provider is a structural change rather than a rewrite.

---

## Suggested order

1. **Finish the UI for existing APIs** — garage, components, logging service, photos. Everything
   else is built on sand until this is done.
2. **Onboarding, empty states, skeletons** — the cheapest lift in perceived quality.
3. **AI component recognition** — the one genuine differentiator, and the backend is already waiting.

i18n, analytics and deep links can wait for the first real users.

---

## Open questions

- Is the bike shop / mechanic mode (`organization`) a product direction or leftover scaffolding?
- Monetization — is there a free/pro split planned? It changes what belongs behind a paywall.
- Which of the product features above deserves a PRD first?
