# Card surface

The standard elevated card look. The material itself lives in `global.css` as tokens, so a
card only says which of the three elevations it is.

```tsx
<Paper
  radius="lg"
  p="md"
  style={{
    // Colour, glow and shadow are separate fields on purpose: `bg` would emit the
    // `background` shorthand and wipe the gradient.
    backgroundColor: "var(--mantine-color-cards-6)",
    backgroundImage: "var(--card-glow)",
    border: "none",
    boxShadow: "var(--elev-panel)",
  }}
>
```

## Elevation

Three steps, and nothing between them:

| token          | for                                           | padding  |
| -------------- | --------------------------------------------- | -------- |
| `--elev-row`   | a list row in a stack of its own kind         | `p="sm"` |
| `--elev-panel` | a panel, a sheet, a dashboard card            | `p="md"` |
| `--elev-hero`  | the one largest card on a screen (`BikeCard`) | `p="md"` |

Do not write a shadow literal into a component. A new shadow means a fourth elevation,
which is a change to this file first.

## Cards on a saturated surface

`--card-glow` is lit for the near-black `cards.6`: a 7% primary tint that disappears on a
brand-coloured fill, leaving the card flat. `BikeStravaCard` on `strava.6` was the first to
hit it.

Do not answer that by lighting the surface. Every tool for it fails on a bright fill: a white
inset hairline reads as a 2008 bevel, a white sheen across the top reads as a glossy iOS 6
button, and a tonal gradient long enough to model the card crosses the luminance point where
the readable text colour flips — over `strava.6` to `strava.8`, dark text falls to 3.10:1 at
the bottom while light text is at 2.74:1 at the top, so no single colour passes at both ends.

A coloured card is a **block**, and a block takes its depth from scale and overlap:

```tsx
// The card crops the mark rather than laying it out.
position: "relative",
overflow: "hidden",
```

`BikeStravaCard` keeps a flat `strava.6` fill and the standard `--elev-panel`, and puts an
oversized Strava mark behind the content, running off the right edge. The mark is a **darker
shade of the fill**, not a lighter one — `textDark.6` at 12% opacity — so the card stays
duotone and the contrast floor moves the safe way.

Check the text against the mark, not the fill: `textDark.6` over the blended shape is 5.32:1
at 12% opacity, and 4.53:1 at 20%, which is where this technique runs out.
## Type scale

Four roles carry every card. Anything else is drift.

| role          | style                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------ |
| eyebrow       | `fz={11} fw={400}` mono, uppercase, `lts="0.08em"`, `var(--color-text-dim)`                      |
| title         | `fz={16} fw={600} c="text.6"`                                                                    |
| body and data | `fz={13}` — mono for numbers and dates, sans for words — `c="text.7"` or `var(--color-text-dim)` |
| hero number   | `fz={32} fw={700}` mono (`HistoryTotalsCard` only)                                               |

Never `c="cards.3"` for text: it is a surface shade and lands at 4.15:1 on `cards.6`, under
the 4.5:1 floor. Never a weight under 400 below 14px — Inter Thin breaks up at that size.

## Rules

- Use `backgroundColor`, never Mantine's `bg` prop. `bg` emits the `background` shorthand,
  which wipes the gradient.
- The hairline border stays on every card. `ReportCard` is the one exception: its
  perforation bites notches out of the card edge and a border would draw across them.
- Margins belong to the page, not to the card. A card that carries its own `m-3` doubles
  the gap to the card above it.
- `active:scale-[0.985]` belongs on cards that are themselves one button. A card carrying
  its own buttons does not press.
- A column beside a fixed-width element needs `style={{ flex: 1, minWidth: 0 }}`,
  without which `lineClamp` has nothing to clamp against.

## Where it lives

**List rows go through `CompletedRideCard`.** They carry the same surface at list weight —
`p="sm"` and `--elev-row`, so a stack of them does not read as a stack of sheets. Completed rides, pending rides and service
history are one row shape — leading visual, title, date, metadata, metric row,
optional chevron — so they share `_frontend/bikecheck/src/components/CompletedRideCard.tsx`
rather than repeating the surface. Use `HistoryMetric` for each reading in the
metric row. New history lists belong here too.

**Service rows are the exception.** They left `CompletedRideCard`: a service card leads with an
eyebrow (`SERVICE · 3 ACTIONS`), puts its price at the top edge and lists its Actions as
bullets, which is no longer the ride row's shape. They lean on mono for the eyebrow,
date, bullets and price, but the roles above still decide their sizes. Inside a Month Group each service keeps its
own card — the month only gathers them under a heading, which sticks to the top of the
screen while that month scrolls past. The surface itself lives in
`_frontend/bikecheck/src/features/service/serviceCardSurface.ts`, so the standalone card
and the cards inside a month cannot drift apart.

Everything that is _not_ a list row writes the four fields out inline and reaches for the
tokens — sheets, the dashboard cards, the wizard steps, `InAppNotification`. The values
they used to copy are gone; only the choice of elevation is theirs. Pulling the four fields
themselves into a component is a structural change — ask before doing it.

`ReportCard` is the one card that reads its surface off its own state: a published link
sits at `--elev-panel` with a green glow, an unpublished one at `--elev-row`, and a revoked
one is pressed into the page with an inset shadow instead.
