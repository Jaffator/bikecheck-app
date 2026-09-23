# Drawers

Every bottom sheet in the app opens the same way. One motion, one timing — a sheet that
snaps open reads as a different app than the one that slides.

## The transition, on every Drawer

```tsx
<Drawer
  position="bottom"
  radius="lg"
  withCloseButton={false}
  transitionProps={{
    duration: 400,
    exitDuration: 400,
    transition: "slide-up",
    timingFunction: "cubic-bezier(0.2, 0, 0, 1)",
  }}
  overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
>
```

No sheet picks its own duration or easing. `BikeSpecsDrawer` is the reference.

## A remounted sheet has to open on the next frame

Mantine skips the enter transition for a Drawer that mounts already `opened` — so any sheet
whose body is remounted per opening (the usual way to discard a cancelled form) would snap
open. It mounts closed and flips on the next frame:

```tsx
const [visible, setVisible] = useState(false);
useEffect(() => {
  if (!opened) {
    setVisible(false);
    return;
  }
  const frame = window.requestAnimationFrame(() => setVisible(true));
  return () => window.cancelAnimationFrame(frame);
}, [opened]);

return <Drawer opened={visible} ... />;
```

A sheet that stays mounted across openings passes `opened` straight through. See
`BikeComponentFormDrawer` for the remounted case.

## The grabber is what closes a sheet by hand

Every bottom sheet wears `SheetGrabber` at its top. It draws the pill people read as "this
layer floats", and it is what hangs the closing drag on the sheet. The pill gets 8px either
side and gives that room straight back with a negative margin, so no sheet moves by adopting
one.

```tsx
<SheetGrabber onClose={onClose} />
```

A sheet that keeps Mantine's own header has nothing to sit above in the flow, so there the
strip is laid over the header's top edge and the header makes room for it:

```tsx
styles={{
  content: { position: "relative", ... },
  header: { paddingTop: SHEET_GRABBER_HEADER_PADDING, ... },
}}
...
<SheetGrabber onClose={onClose} floating />
```

The gesture itself is `useSheetSwipe`, and it listens on the sheet rather than on the pill:
a drag starting anywhere in the sheet's top 120px moves it, while every tap below still lands
because nothing is laid over the content. It takes the gesture only once the finger has gone
10px straight down, and only while the list under it is at its top - a sheet being read is
never dragged out from under the reader. The sheet then stands where the finger is; on release
it closes when the drag covered a quarter of the sheet's height or ended in a flick, and
otherwise springs back on the sheet's own transition. Upwards there is nothing to open into,
so a drag that way moves nothing.
