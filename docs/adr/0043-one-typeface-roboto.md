# One typeface: Roboto

ADR 0039 settled on one face for everything and picked Geist. The one face stays; the face changes.

**Roboto is the only typeface.** App, public profile, print reports, dials, the marketing website
and the Play Store graphics all use it. Roboto is Android's system face, so the app reads as native
on the platform most riders install it on.

## What stays from ADR 0039

- One face, no mono and no display face; figures line up with `tabular-nums`.
- Weights 400/500/600/700. Google Fonts serves Roboto as a variable font, so the 600s stay 600.
- The three `--tracking-*` tokens keep their values; they are retuned only if a screen looks wrong.

## Loading

Unchanged paths: the app loads Roboto from Google Fonts in `index.html`; the website self-hosts the
variable `.woff2` (latin + latin-ext) so no visitor IP goes to Google.

## Consequences

- On iOS and desktop Roboto is not the system face — there it is just the app's face. Accepted.
- The website hero's readout offset is derived from the headline's cap line, so it was recomputed
  for Roboto's metrics (0.1265 → 0.1212 of the font size).
- The phone captures in `Design/store/screens/` show the app as it was shot; they stay in Geist
  until they are reshot.
- ADR 0039 is history for the choice of face; `docs/design.md` §9 wins.
