# The desktop layout is chosen by the window's width

`docs/design.md` promised a sidebar on desktop from the first page, and it was never built. Every
screen, the tab bar and every sheet sit in one 44rem column (`CONTENT_MAX_WIDTH`) centred in
whatever window they are given. On a laptop the app is a phone standing in the middle of the
screen, with a pill of tabs floating under it.

**From 60em (960px, Mantine's `md`) the shell is a desktop web app**, not a wider phone. Below it
nothing changes: the tab bar, the FAB, the bottom sheets and the gestures stay exactly as they are.
The theme lowers Mantine's default 62em so a phone browser's "Desktop site" mode, which lays the
page out at 980px, gets the desktop shell too.

## What the desktop shell is

- **A fixed sidebar, 240px, always labelled.** Home, Bikes, Service and Rides, then a divider,
  then Riders (carrying the pending-requests dot the More tab carries today) and Chat. The More
  tab and its drawer do not exist on desktop: the sidebar has room for what they were hiding.
- **A global "+ New" menu at the top of the sidebar**, offering Add bike and Add service from
  any page. It replaces the FAB, whose offer changed with the route.
- **Notifications and the account at the bottom of the sidebar**: a Notifications row with the
  unread count, and the avatar with the user's name leading to `/settings`. The top header keeps
  only the page's title, its back arrow and its `actionSlot`.
- **The sidebar never leaves.** Sub-pages and wizards keep it; the active row is chosen by path
  prefix, as `isActivePath` already does. Only full-screen routes (`/strava-connected`) drop it,
  and `chromeHidden` hides the header alone.
- **Two content widths, chosen by the page.** `wide` (~75rem) for the overviews — Home, Bikes,
  Bike detail, Service, Rides — which lay themselves out in columns. `narrow` (44rem, today's
  column) for forms, wizards and everything read top to bottom: Settings, Chat, Follows,
  Notifications, Reports, profiles. A form stretched to 1200px is harder to read, not roomier.
- **It behaves like a desktop page.** Touch gestures are off — swiping panels and bikes,
  pull-to-refresh, dragging a sheet — because each already has a click-able twin on screen and
  React Query refetches on window focus. Text can be selected, clickable cards and rows show a
  hover state and a pointer, and keyboard focus is visible.

## One definition of "desktop"

Mantine's `md` is 60em here and Tailwind's `md` is 48rem, so the same word switched two different
layouts at two different widths. There is now one query, `DESKTOP_QUERY` in `layout/`, read three
ways: `useIsDesktop()` for logic, Mantine's `visibleFrom="md"` / `hiddenFrom="md"` for markup, and
a Tailwind variant `desktop:` declared in `global.css`. Tailwind's own `sm`/`md`/`lg` are left
alone because the public profile pages already lay themselves out with them.

## Considered options

**Switching by platform** — web gets the sidebar, the Capacitor app never does — was rejected. A
phone-width browser window deserves the tab bar and a landscape Android tablet deserves the
sidebar; the width is what the user actually has.

**A sidebar that collapses to icons** was rejected for now. The content here is cards and lists
that do not need the extra 180px, and a collapsed state means persisting it, tooltips and a second
shape for every row. It can be added without undoing anything.

**Create buttons in each page's header**, keeping the FAB's per-route offer, was rejected in
favour of one menu that is always in the same place and reachable from Rides or Chat too.

**Master-detail for the garage** — the bike list beside the open bike — was rejected. The bike
detail is a destination with its own sheets and a lot to show, a garage holds a handful of bikes,
and it would need nested routes where every page is remounted by its path today. It stays
`/bikes/:id`, as ADR 0010 already kept it. The lists that do sit beside their detail are the ones
whose detail is already a layer over them: see ADR 0036.

## Consequences

- `AppShell` gains its `navbar` slot; the footer, the FAB and `MoreDrawer` render below `md` only.
- The header's 3rem and the 6rem kept clear for the FAB are hard-coded in about a dozen pages as
  sticky offsets and bottom padding. Each becomes aware of the desktop shell or loses the value.
- Pinned action bars (ADR 0009's total and save, the wizards, Setup, the chat composer) stay
  pinned to the bottom, but on desktop they are offset by the sidebar and as wide as the `narrow`
  column instead of 92% of the window.
- `key={pathname}` on the main area stays: nothing here needs a page to survive a route change.
- `global.css` turns text selection and the tap highlight back on only above the breakpoint.
- The frontend has no tests, so the mobile layout is checked by hand at each step.
