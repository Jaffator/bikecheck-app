# One typeface: Geist

The app spoke in Inter with JetBrains Mono for numbers, dates and every uppercase label; the public
profile brought its own Archivo and Martian Mono, loaded only while a `/u/*` page was open; the
setup dials asked for Archivo and, inside the app, silently fell back to `system-ui`. Four faces,
two loading paths, and about 120 hand-typed letter-spacing values between `-0.0188em` and `0.22em`
(issue #190).

**Geist is the only typeface.** App, public profile, print reports and dials all use it, loaded
once in `index.html` at 400/500/600/700.

## Mono goes

Mono did two jobs: it lined figures up, and it marked a line as metadata. The first is what
`tabular-nums` does in the body face without a second font. The second was already carried by size,
case and colour — every mono label was also small, uppercase and dim — so dropping the face loses
no information.

## Archivo goes

The public page had its own pair (Archivo headlines, Martian Mono data), fetched by a second font
request on the one page strangers land on, and the dials that reused Archivo never loaded it. It
now uses the app's face and keeps its own colour tokens under `.pp`.

## Tracking becomes three tokens

Letter-spacing follows size and case, not the screen it happens to be on: `--tracking-label`
(0.08em) for uppercase up to 13px, `--tracking-title` (-0.01em) for 20–27px, `--tracking-display`
(-0.02em) from 28px, and 0 for everything else. The rule lives in `docs/design.md` §9.

## Consequences

- `--font-mono`, `DIAL_FONT`, `.pp-display`, `.pp-mono` and the public page's font loader are gone.
- Weights 100 and 800/900 are mapped to 400 and 700; neither was loaded, so the browser already
  drew them as the nearest loaded weight.
- Some dial lettering and one 18px hint lost their spacing where the table says 0 — a visible
  change on the dials, accepted for one rule.
- Earlier ADRs and docs that mention Inter or mono are history; §9 wins.
