# Card surface

The standard elevated card look. Copy it verbatim onto any surface that should
read as the same material — a list card, a sheet, an in-app banner.

```tsx
<Paper
  radius="lg"
  p="md"
  style={{
    // Colour, glow and inner edge all live in this one object: `bg`
    // would emit the `background` shorthand and wipe the gradient.
    backgroundColor: "var(--mantine-color-cards-6)",
    backgroundImage:
      "radial-gradient(90% 120% at 0% 0%, color-mix(in srgb, var(--mantine-color-primary-6) 7%, transparent) 0%, transparent 45%)",
    border: "1px solid var(--color-border-subtle)",
    boxShadow:
      "inset 0 1px 0 0 rgba(255, 255, 255, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.35), 0 8px 16px -6px rgba(0, 0, 0, 0.5)",
  }}
>
```

## Rules

- Use `backgroundColor`, never Mantine's `bg` prop. `bg` emits the `background`
  shorthand, which wipes the gradient.
- Text inside: title `fw={600} fz={15} c="text.6"`, body `fz={13} c="text.7"`.
- A column beside a fixed-width element needs `style={{ flex: 1, minWidth: 0 }}`,
  without which `lineClamp` has nothing to clamp against.

## Where it lives

**List rows go through `HistoryCard`.** They carry the same surface at list weight —
`p="sm"` and a shallower `0 4px 12px -6px` outer shadow, so a stack of them does not read
as a stack of sheets. Completed rides, pending rides and service
history are one row shape — leading visual, title, date, metadata, metric row,
optional chevron — so they share `_frontend/bikecheck/src/components/HistoryCard.tsx`
rather than repeating the surface. Use `HistoryMetric` for each reading in the
metric row. New history lists belong here too.

**Service rows are the exception.** They left `HistoryCard`: a service card leads with an
eyebrow (`SERVICE · 3 ACTIONS`), puts its price at the top edge and lists its Actions as
bullets, which is no longer the ride row's shape. They carry their own type scale too —
mono for the eyebrow, date, bullets and price, and the headings face for the bike name —
so the Inter rules above do not apply to them. Inside a Month Group each service keeps its
own card — the month only gathers them under a heading, which sticks to the top of the
screen while that month scrolls past. The surface itself lives in
`_frontend/bikecheck/src/features/service/serviceCardSurface.ts`, so the standalone card
and the cards inside a month cannot drift apart.

Everything that is *not* a list row still carries its own inline copy, because the
surface is all they share:

- `_frontend/bikecheck/src/features/strava/PendingRideSheet.tsx`
- `_frontend/bikecheck/src/components/InAppNotification.tsx`

Keep those copies in step with the snippet above. Pulling the bare surface out from
under them into a component of its own is a structural change — ask before doing it.
