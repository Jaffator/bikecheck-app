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

Duplicated inline at each site rather than extracted into a shared component:

- `_frontend/bikecheck/src/features/strava/PendingRideSheet.tsx`
- `_frontend/bikecheck/src/features/strava/PendingRidesCard.tsx`
- `_frontend/bikecheck/src/components/InAppNotification.tsx`

Keep the copies in step. Factoring it out into one component is a structural
change — ask before doing it.
