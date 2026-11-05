# One typeface: Geist, again

ADR 0043 swapped Geist for Roboto so the app would read as native on Android. A week of it showed
the cost: Roboto made the app look generic, and BikeCheck lost the character Geist gave it.

**Geist is the only typeface again.** App, public profile, print reports, dials, the marketing
website and the Play Store graphics all use it. The face choice of ADR 0043 is superseded; looking
native on Android is no longer a goal for the type.

## What stays

- One face, no mono and no display face; figures line up with `tabular-nums` (ADR 0039).
- Weights 400/500/600/700.
- The three `--tracking-*` tokens keep their values; they were tuned for Geist in the first place.

## Loading

The same paths ADR 0043 used: the app loads Geist from Google Fonts in `index.html`; the website
self-hosts the variable `.woff2` (latin + latin-ext). Emails keep the system font stack.

## Consequences

- The website hero's readout offset goes back to Geist's metrics (0.1212 → 0.1265 of the font size).
- The Play Store graphics are re-rendered; the phone captures in `Design/store/screens/` were shot in
  Geist, so they match the frame again.
- `docs/design.md` §9 wins over both earlier ADRs.
