# Pinned action bar

A floating bar that holds a screen's committing action — and, optionally, the one number
that action is about — above the bottom edge for the whole screen. Copy it verbatim onto
any long page whose primary action would otherwise scroll away.

Same material as the tab bar, not the flat edge-to-edge footer `AddBikeFooter` uses:
a pill inset from both edges, blurred, with the page fading out beneath it.

```tsx
<Box
  style={{
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    // Rides above the software keyboard, which the webview does not resize for.
    transform: `translateY(-${keyboardOffset}px)`,
    display: "flex",
    justifyContent: "center",
    paddingBottom: "calc(0.75rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))",
    zIndex: 100,
    // Only the bar itself takes taps; the rest of this strip is page underneath.
    pointerEvents: "none",
  }}
>
  {/* Fades page content out under the bar instead of cutting it off. */}
  <Box
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: "8rem",
      background: "linear-gradient(to top, rgba(0, 0, 0, 0.90), transparent)",
      pointerEvents: "none",
      zIndex: -1,
    }}
  />
  <Stack
    gap={6}
    w="92%"
    px="md"
    py="sm"
    className="rounded-3xl border border-gray-720 bg-cards-600/30 backdrop-blur-md"
    style={{
      pointerEvents: "auto",
      boxShadow: "0 6px 20px color-mix(in srgb, var(--mantine-color-text-6) 15%, transparent)",
    }}
  >
    {/* An error belongs beside the button that failed, not in page the bar may be covering. */}
    <Group justify="space-between" wrap="nowrap" gap="sm">
      {/* Left: what the action is about. Right: the action. */}
    </Group>
  </Stack>
</Box>
```

## Rules

- `pointerEvents: "none"` on the outer strip and `"auto"` on the pill. Without the pair,
  the full-width strip swallows taps on page content either side of the pill.
- The page must reserve room for the bar: a bottom padding of roughly `5rem` on the
  screen's own stack, on top of whatever padding the page already carries. The bar floats,
  so nothing else keeps the last field clear of it.
- Anything typed into the bar needs `useKeyboardOffset`. The Android webview does not shrink
  for the keyboard — `resizeOnFullScreen` is off in `capacitor.config.ts` — so a bar fixed to
  the bottom is typed into blind. Pass its value into the `translateY` above.
  `useScrollIntoViewOnFocus` does **not** cover this: it moves a field in the scroll flow above
  a fixed footer, not the footer itself.
- Failure messages go inside the pill, above the action row. A message in the scroll flow can
  end up behind the bar it refers to.
- Only on screens whose footer chrome is already collapsed. Sub-page routes hide the tab bar
  (`SUB_PAGE_ROUTES` in `AppLayout`); on a tabbed route the two would stack.
- A number shown here is edited here — it is not also a field in the flow. Two editable copies
  of one value is where the sync bugs come from.

## Where it lives

**No shared component.** It is written inline in the screen that owns it, because the contents
differ per screen — the action, and whatever the action is about.

Two screens of the Add Service wizard carry one, and they are the illustration of why the
contents are not shared:

- **Summary** — `ServiceSummaryStep.tsx`. The visit's total as an in-place-editable
  `NumberInput`, and Save service (ADR 0009).
- **Actions** — `ServiceActionsStep.tsx`. The category's cost as a read-only tally, written the
  same way as the Summary's total, and Save action. Marked `data-fixed-footer`, because the step's own price
  and note fields need `useScrollIntoViewOnFocus` to clear it.

Same shape, different contents. Extract a shared component only once a screen wants the same
*contents*, not merely the same shape.
