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
