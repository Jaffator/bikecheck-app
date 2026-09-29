# On desktop a sheet is a side panel or a modal

The app has nineteen bottom sheets, each a Mantine `Drawer` with `position="bottom"` wearing the
transition, radius and `SheetGrabber` that `docs/conventions/drawers.md` prescribes. On a phone
they are the right shape. On a desktop, next to the sidebar of ADR 0035, a sheet rising from the
bottom of the window with a grab handle nobody can grab is the one piece of the phone left over.

**On desktop a sheet becomes one of two things, chosen by what it holds:**

- **A panel from the right**, for a sheet that shows one thing out of a list the user is still
  reading: `ServiceDetailSheet`, `PendingRideSheet`, `BikeComponentDetailSheet`,
  `BikeSpecsDrawer`. The list stays in view beside it, which is the master-detail a desktop user
  expects from Service.
- **A centred modal**, for a sheet that asks for something and closes: the forms and
  confirmations — profile edit, password, account deletion, custom tag, custom parts, component
  form, tracked action, share, export, archive, remove follower, gear linking, setup profile name.
  `RideDetailSheet` is the one reader here: it opens from Home, where there is no list to stay
  beside, and its route on a real map belongs in the middle of the screen, not on its edge.

Below the breakpoint every sheet stays exactly the bottom sheet `drawers.md` describes.

## One wrapper instead of nineteen branches

The choice lives in one shared component, `ResponsiveSheet`, which takes a
`desktop="panel" | "modal"` prop. Below `md` it renders today's bottom drawer, with the convention's
transition, `SheetGrabber` and drag-to-close; above it, a right-side `Drawer` or a `Modal`, closed
by its cross, Esc or a click outside. Each sheet states its kind once and stops repeating the
transition props it copies today.

## Considered options

**Every sheet a modal** was rejected: a service's detail in a box over its own list hides the
list the user opened it from, and the panel beside it is the reason to have a wide screen.

**Every sheet a panel** was rejected: a three-field form in a full-height strip on the edge of
the screen reads as unfinished, and a confirmation belongs in the middle of the user's attention.

**Branching in each sheet** on `useIsDesktop()` was rejected: nineteen copies of the same fork,
drifting apart the way the transition props already could.

## Consequences

- ADR 0010 is untouched. The detail is still a layer addressed by the query string, so the list
  under a panel keeps its scroll and its loaded pages, and browser back closes the panel.
- `SheetGrabber` and `useSheetSwipe` are used below the breakpoint only.
- `drawers.md` gains the desktop half of the convention and the rule for picking panel or modal.
- The split above is where the migration starts, not a law: a sheet that turns out to be read
  more than filled in moves to `panel` in the change that finds it, unless, like
  `RideDetailSheet`, it also opens where no list stands beside it.
