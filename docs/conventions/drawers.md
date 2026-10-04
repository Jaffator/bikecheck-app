# Drawers

Every sheet in the app goes through `ResponsiveSheet` (`src/components/ResponsiveSheet.tsx`).
Below 60em it is a bottom sheet; from 60em it is a panel from the right or a centred modal
(ADR 0036). One motion, one timing — a sheet that snaps open reads as a different app than the
one that slides — so no sheet builds a `Drawer` itself or picks its own duration, easing,
radius, overlay or surface.

`MoreDrawer` is the one exception: it exists below the breakpoint only (ADR 0035).

## What a sheet passes

```tsx
<ResponsiveSheet
  opened={opened}
  onClose={onClose}
  desktop="modal"
  title={t("profile.editTitle")}
  zIndex={DRAWER_Z_INDEX}
  styles={{ content: { height: "auto", maxHeight: "88dvh" } }}
>
```

What it holds, whether it is a panel or a modal on desktop, and its own layout. A sheet that
draws its own header passes `withCloseButton={false}` and no `title`; on a phone the ✕ is still
the wrapper's (see [Spacing and the ✕](#spacing-and-the--on-a-phone)).

A sheet that must be answered passes `dismissible={false}`: no outside click, Esc, swipe or back
button closes it, and it closes itself once answered. Only `CheckInPromptDrawer` does.

The wrapper brings the rest: the transition, the radius, the overlay, the card surface, the
grabber, and the entry on the overlay stack that Android's back gesture closes.

## Panel or modal

- **`desktop="panel"`** for a sheet that shows one thing out of a list the user is still
  reading: `ServiceDetailSheet`, `PendingRideSheet`, `BikeComponentDetailSheet`,
  `BikeSpecsDrawer`.
- **`desktop="modal"`** for a sheet that asks for something and closes: every form and
  confirmation. Also `RideDetailSheet`, which opens from Home with no list beside it (ADR 0036).

A modal that turns out to be read more than filled in moves to `panel` in the change that finds it,
unless it also opens where no list stands beside it.

## On a phone

```tsx
position="bottom"
radius="lg"
transitionProps={SHEET_TRANSITION}
overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
```

The motion lives in `src/components/sheetMotion.ts`, the one place to tune it. In: 400 ms,
`cubic-bezier(0.2, 0, 0, 1)`. Out: 300 ms, `cubic-bezier(0.3, 0, 0.8, 0.15)`. The sheet slides
without fading. With one decelerating curve for both ways (Mantine's `slide-up`), the exit spent
its slow tail already transparent and off screen, so it read as a snap.

How tall the sheet stands is the sheet's own: `height`, `maxHeight` and the keyboard's
`marginBottom` in `styles.content`.

## Spacing and the ✕ on a phone

Design: [BikeCheck – drawer spacing](https://claude.ai/artifact/YKgZLEbo11bZ2qGk4t9x97), artboard
"Pravidlo pro všechny drawery". The wrapper owns every number here, so no sheet sets its own and
no sheet overrides them. Tokens in `global.css`, never a literal:

| Token                     | Value | What                                          |
| ------------------------- | ----- | --------------------------------------------- |
| `--sheet-handle-top`      | 16px  | top edge → pill                               |
| `--sheet-handle-bottom`   | 20px  | pill → first element                          |
| `--sheet-pad-x`           | 16px  | both sides                                    |
| `--sheet-pad-bottom`      | 24px  | last element → system bar, plus the safe area |
| `--sheet-close-target`    | 44px  | ✕ touch area                                  |
| `--sheet-close-inset`     | 4px   | ✕ target from the top and right edge          |
| `--sheet-title-pad-right` | 24px  | title → ✕                                     |

- **Bottom.** The last element ends 24px above the system bar, in scrolled content too:
  `calc(var(--sheet-pad-bottom) + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))`
  (`SHEET_PAD_BOTTOM`), the safe-area expression the rest of the app uses. Without it a button
  sits under Android's gesture bar.
- **✕.** Every bottom sheet has one, and the wrapper draws it (`SheetCloseButton`). The icon stands
  alone, 16px with a 2px stroke and no circle behind it. It sits in the sheet's top-right corner
  whatever the title does: a 44px target 4px from the top and right edge,
  `aria-label={t("action.close")}`. A sheet with its own header draws no ✕ of its own on a phone.
- **Title.** It keeps 24px clear on the right, so a long one wraps before it reaches the ✕.
- **No ✕** on a sheet with `dismissible={false}` (`CheckInPromptDrawer`): it must be answered.
- **Scroll.** Only the body scrolls, so the grabber, a `title` and the ✕ stay where they are while
  a long sheet is read.
- `MoreDrawer` builds its own `Drawer` but takes the same tokens and `SHEET_TRANSITION`.

The wrapper lays its padding over whatever a sheet passes in `styles`, so a sheet's own padding
reaches only the desktop panel or modal. A sheet passes the `padding` shorthand on desktop only:
mixed with the wrapper's longhands, it is lost when an open panel crosses the breakpoint.

On desktop nothing here applies: a panel or modal keeps Mantine's header and ✕, or the sheet's own.

## On desktop

- **Panel**: a right-side `Drawer`, the window's full height. No overlay, no scroll lock, no
  focus trap — the list stays live beside it, and clicking another row swaps what the panel
  shows. A list addressed by the query string (ADR 0010) replaces the entry when it swaps, so
  back and ✕ still close the panel rather than walking through every row opened.
- **Modal**: a centred `Modal` with Mantine's own entrance, the one `ConfirmModal` makes, over
  the same overlay.
- No grabber and no drag. Closed by ✕, Esc and — the modal — a click outside, unless
  `dismissible={false}`.
- The content's `height`, `maxHeight` and `marginBottom` are dropped: a panel is as tall as the
  window, a modal as its content.
- Esc closes the top layer only. A panel under a confirmation, or a modal under another, stays.

## A remounted sheet opens on the next frame

Mantine skips the enter transition for a sheet that mounts already `opened` — so any sheet whose
body is remounted per opening (the usual way to discard a cancelled form) would snap open.
`ResponsiveSheet` mounts it closed and flips it on the next frame itself, so the sheet passes
`opened` straight through either way. See `BikeComponentFormDrawer` for the remounted case.

Key the body on `useOpeningCount(opened)`, never on `opened` itself: a key that changes on close
throws the sheet away before it can slide out.

## A closing sheet keeps what it showed

`ResponsiveSheet` keeps drawing the last `title` and children it had while open until the exit
ends. So a sheet may render its body as `{ride !== null && …}` and still slide out full, not as
an empty card.

## The grabber is what closes a sheet by hand

Every bottom sheet wears `SheetGrabber` at its top, and `ResponsiveSheet` places it. It draws the
pill people read as "this layer floats", and it is what hangs the closing drag on the sheet. The
pill stands `--sheet-handle-top` below the sheet's edge and `--sheet-handle-bottom` above the first
element (see [Spacing and the ✕](#spacing-and-the--on-a-phone)). A sheet with `dismissible={false}`
keeps the pill but not the drag.

The strip is laid over the sheet's top edge on the sheet's own surface, and whatever comes first
makes room for it (`SHEET_GRABBER_ROOM`): Mantine's header when there is a `title`, the body when
there is not. A scrolled body passes under it.

The gesture itself is `useSheetSwipe`, and it listens on the sheet rather than on the pill:
a drag starting anywhere in the sheet's top 120px moves it, while every tap below still lands
because nothing is laid over the content. It takes the gesture only once the finger has gone
10px straight down, and only while the list under it is at its top - a sheet being read is
never dragged out from under the reader. The sheet then stands where the finger is; on release
it closes when the drag covered a quarter of the sheet's height or ended in a flick, and
otherwise springs back on the sheet's own transition. Upwards there is nothing to open into,
so a drag that way moves nothing.
