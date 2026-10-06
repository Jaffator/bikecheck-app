# The Marketing Website owns the apex, the App lives on `app.`

Until now `bikecheck.cloud` served the App itself: whoever opened the address landed on the login
form, with nothing to read first, and Google's brand verification wants a public homepage that
describes the app. **`bikecheck.cloud` is now the Marketing Website, a static site with no sign-in.
The App — the SPA, `/api`, `/strava`, `/u/…`, `/r/…`, `/legal/…` — moves whole to
`app.bikecheck.cloud`.** One Caddy serves both, chosen by host.

## Considered options

**One host split by path** — the Marketing Website at `/`, the App under `/app/…` — was rejected.
The dashboard is `/`, so every route and link would move under a basename, and the Android build,
which runs at `https://localhost/`, would need a different one from the web build. Two deploy units
would also share one root and one `assets/` namespace.

**Redirecting the App's old apex paths** (`/u/…`, `/r/…`, `/verify-email`) to `app.` was rejected:
there were no riders at the switch, so no link in the wild could break.

## Consequences

- Everything addressed from outside binds to `app.bikecheck.cloud`: the Google redirect URI, the
  Strava callback domain, the links in every email (`PUBLIC_APP_URL`), the Android App Link host with
  its `assetlinks.json`, and every Share Link and Public Profile address. Moving the App again means
  changing all of them and redirecting the old addresses.
- Session cookies stay host-only on `app.`, so the Marketing Website cannot tell a signed-in visitor.
  Its buttons always lead into the App, which shows the dashboard to whoever already has a session.
- The Marketing Website hands the visitor's language and intent over in the link (`?lang=`,
  `?mode=register`). The App reads `?lang=` on any public route.
- Legal documents live only in the App; the Marketing Website links to them.
- The App's `robots.txt` admits only its public pages (`/u/`, `/r/`, `/api/preview/`, `/legal/`):
  a search for BikeCheck should find the Marketing Website, not a login form.
- The Marketing Website's source lives in `_website_landing/` and is compiled (Tailwind) to `dist/`,
  the only folder Caddy serves. The old `bikecheck-web` repo is archived.
