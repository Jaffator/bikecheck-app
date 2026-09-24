# Drawers

Every sheet in the app goes through `ResponsiveSheet` (`src/components/ResponsiveSheet.tsx`).
Below 62em it is a bottom sheet; from 62em it is a panel from the right or a centred modal
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
draws its own header with its own ✕ passes `withCloseButton={false}` and no `title`.

The wrapper brings the rest: the transition, the radius, the overlay, the card surface, the
grabber, and the entry on the overlay stack that Android's back gesture closes.

## Panel or modal

- **`desktop="panel"`** for a sheet that shows one thing out of a list the user is still
  reading: `ServiceDetailSheet`, `RideDetailSheet`, `PendingRideSheet`,
  `BikeComponentDetailSheet`, `BikeSpecsDrawer`.
- **`desktop="modal"`** for a sheet that asks for something and closes: every form and
  confirmation.

A modal that turns out to be read more than filled in moves to `panel` in the change that finds it.

## On a phone

```tsx
position="bottom"
radius="lg"
transitionProps={{ duration: 400, exitDuration: 400, transition: "slide-up", timingFunction: "cubic-bezier(0.2, 0, 0, 1)" }}
overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
```

How tall the sheet stands is the sheet's own: `height`, `maxHeight` and the keyboard's
`marginBottom` in `styles.content`.

## On desktop

- **Panel**: a right-side `Drawer`, the window's full height. No overlay, no scroll lock, no
  focus trap — the list stays live beside it, and clicking another row swaps what the panel
  shows. A list addressed by the query string (ADR 0010) replaces the entry when it swaps, so
  back and ✕ still close the panel rather than walking through every row opened.
- **Modal**: a centred `Modal` with Mantine's own entrance, the one `ConfirmModal` makes, over
  the same overlay.
- No grabber and no drag. Closed by ✕, Esc and — the modal — a click outside.
- The content's `height`, `maxHeight` and `marginBottom` are dropped: a panel is as tall as the
  window, a modal as its content.
- Esc closes the top layer only. A panel under a confirmation, or a modal under another, stays.

## A remounted sheet opens on the next frame

Mantine skips the enter transition for a sheet that mounts already `opened` — so any sheet whose
body is remounted per opening (the usual way to discard a cancelled form) would snap open.
`ResponsiveSheet` mounts it closed and flips it on the next frame itself, so the sheet passes
`opened` straight through either way. See `BikeComponentFormDrawer` for the remounted case.

## The grabber is what closes a sheet by hand

Every bottom sheet wears `SheetGrabber` at its top, and `ResponsiveSheet` places it. It draws the
pill people read as "this layer floats", and it is what hangs the closing drag on the sheet. The
pill gets 8px either side and gives that room straight back with a negative margin, so no sheet
moves by adopting one.

A sheet with a `title` or Mantine's close button has a header with nothing above it in the flow,
so there the strip is laid over the header's top edge and the header makes room for it
(`SHEET_GRABBER_HEADER_PADDING`).

The gesture itself is `useSheetSwipe`, and it listens on the sheet rather than on the pill:
a drag starting anywhere in the sheet's top 120px moves it, while every tap below still lands
because nothing is laid over the content. It takes the gesture only once the finger has gone
10px straight down, and only while the list under it is at its top - a sheet being read is
never dragged out from under the reader. The sheet then stands where the finger is; on release
it closes when the drag covered a quarter of the sheet's height or ended in a flick, and
otherwise springs back on the sheet's own transition. Upwards there is nothing to open into,
so a drag that way moves nothing.
