# BikeCheck — UI/UX Design

> Living design doc. Responsive app: mobile (Capacitor) + desktop web, one React codebase. Keep it lightweight — update as decisions are made.

## 1. What the app does

BikeCheck tracks bikes, their components and service history, and syncs data from Strava.
It computes mileage per component and health indexes for suspension, brake pads, chain and drivetrain.
The user picks from many event types to record a maintenance/service action, or creates a personal
service event. The owner can generate a shareable report (e.g. when selling a bike).

**Core user jobs**

- See my bikes, their mileage and health indexes ("bikes").
- **Log service events — record what was done to the bike (the core of the app).**
- Know when a component needs service (chain, brakes…) based on mileage / health.
- Review rides synced from Strava (with an AI ride summary).
- Get notified (push + in-app) when something needs attention or a new Strava ride arrives.
- Generate a shareable report (bike + components + service history) as a link / PDF.

## 2. Platform & approach

- **Responsive single codebase** — same React app runs as:
  - **Mobile app** via **Capacitor** (Android first, iOS later).
  - **Desktop web** in the browser.
- **Stack (decided):** React + TypeScript + **Mantine** (UI library) + React Router.
  Mantine chosen because it targets web/desktop well and has theming, dark mode, responsive
  breakpoints, forms, notifications and a large component set out of the box.
- Layout **adapts by breakpoint**: bottom tab bar on mobile, sidebar/header nav on desktop.
- One public web route for shared reports (`/r/:token`) — works in any browser, no login.

## 3. Information architecture (screen map)

Navigation is **adaptive** — same destinations, different chrome per screen size. The switch is
the window's width at 60em (Mantine `md`), see [ADR 0035](adr/0035-the-desktop-layout-is-chosen-by-width.md).
Neither notifications nor the account is a primary tab.

```
MOBILE (< 60em)                     DESKTOP (≥ 60em)
┌────────────────────────────┐      ┌──────────────┬───────────────────────┐
│ BikeCheck        🔔(3)  👤 │      │ 🚲 BikeCheck │ Title          [action]│
├────────────────────────────┤      │ [+ New    ▾] ├───────────────────────┤
│                            │      │ 🏠 Home      │                       │
│      (active screen)       │      │ 🚲 Bikes     │    (active screen)    │
│                     (+)FAB │      │ 🔧 Service   │    wide or narrow     │
├─────┬─────┬─────┬─────┬────┤      │ 〰 Rides     │                       │
│Home │Bikes│Serv.│Rides│More│      │ ──────────── │                       │
└─────┴─────┴─────┴─────┴────┘      │ 👥 Riders  • │                       │
                                    │ 💬 Chat      │                       │
More → drawer: Riders, Chat         │ 🔔 Notif.  3 │                       │
                                    │ (J) Name     │                       │
                                    └──────────────┴───────────────────────┘

🔔 Bell (top bar on mobile, sidebar row on desktop) → /notifications
   └─ Notification list → navigate by notification.route ; mark read
👤 Avatar (top bar on mobile, sidebar foot on desktop) → /settings
   Profile, Strava account, notification settings, logout
+  Create: FAB with per-page actions on mobile, global "+ New" menu on desktop

🏠 Home (Dashboard) — landing screen after login
   ├─ Needs attention (service due + health alerts)
   ├─ Last ride (AI summary + rating)
   ├─ Quick stats (bikes count, total km)
   └─ Primary action button → "+ Log service" ("+ Add bike" when there are no bikes)

🚲 Bikes
   └─ Bike list (name, mileage, health badge)
       └─ Bike detail
           ├─ Components (chain, brakes…) + mileage / health index
           ├─ Service history
           ├─ Rides (activities for this bike)
           ├─ Strava link (link gear)
           └─ Shared reports → generate / copy link / revoke

🔧 Service (Maintenance) — core of the app
   ├─ Due / upcoming service items (maintenance_due) → mark done / snooze
   └─ Record a service event (what was done to the bike):
        1. pick a category (component group, e.g. Suspension)
        2. pick an event under it (e.g. "Replace damping cartridge")
        3. actions + affected components auto-fill (editable, can add manually)
        4. add note + cost
      Custom event can be created (e.g. "Replace damping cartridge"
      → Suspension group, Fork component)

📋 Rides
   └─ Feed of recent rides across bikes, each with the AI (Gemini) summary + rating

👤 Account (opened from the avatar menu, not a tab)
   └─ Profile, Strava account, notification settings, organization, logout

Public (outside the logged-in app)
   /r/:token → read-only report (bike + components + service history)
```

## 4. Screens (breakdown)

| Screen        | Key content                                                          | Primary action                  |
| ------------- | ------------------------------------------------------------------- | ------------------------------- |
| Home          | Needs attention (service due/health), last ride, quick stats        | "+ Log service" / "+ Add bike"  |
| Bikes         | List of bikes (image, name, total km, health badge)                 | Tap bike → detail; "+ Add bike" |
| Bike detail   | Components w/ mileage & health, service history, rides, Strava, reports | Generate report, mark service   |
| Service       | Due/soon items **+ record a service event** (category → event → auto-filled actions/components → note + cost) | Log event; mark done / snooze |
| Rides         | Recent rides feed across bikes, with AI summary + rating            | Open ride detail                |
| Inbox (bell)  | Notifications (unread first), grouped by date — `/notifications`   | Navigate via `route`; mark read |
| Account (avatar) | Profile, Strava connection, notification prefs — `/settings`     | Connect Strava, logout          |
| Public report | Frozen snapshot of one bike for buyers                              | Download PDF                    |

## 5. Key flows

**Record a service event (core flow)**

```
Service → "New event"
  1. Category   → component group (e.g. Suspension)
  2. Event      → events_action under that group (e.g. "Replace damping cartridge")
  3. Auto-fill  → actions + affected components (event_action_targets) ; editable, add manually
  4. Details    → note + cost
  → saved as events_bikes (+ event_actions_done) on the bike; updates component mileage/health
Custom event → user-defined events_action (e.g. "Replace damping cartridge"
               → Suspension group + Fork component)
```

**Generate & share report**

```
Bike detail → "Generate report"
  → POST /reports/bikes/:id → returns share_url
  → show link (copy / share) ; optional PDF
Buyer opens /r/:token → public page renders snapshot
```

**Notifications**

```
Backend event → notification stored (DB) + push sent (signal)
  app in background  → system tray notification → tap → navigate by route
  app in foreground  → in-app banner → refetch inbox
Bell badge = count of unread (GET /notifications?unread=true)
```

**Strava linking**

```
Profile → connect Strava → unmatched gear notification
  → screen lists Strava bikes vs BikeCheck bikes → link → done
```

## 6. Navigation & routing

- Tab destinations: `/`, `/bikes`, `/service`, `/rides`. Landing after login = `/`.
- Inbox (`/notifications`) opens from the **bell** — top bar on mobile, sidebar row on desktop.
- Account (`/settings`; `/profile` redirects there) opens from the **avatar** — top bar on mobile,
  sidebar foot on desktop.
- **Follows** (`/follows`, "Riders") and **Chat** (`/chat`) sit in the **More** tab's drawer on mobile,
  dot = pending follow requests — see [Follows entry](ui/follows-entry.md). On desktop both are
  sidebar rows and More does not exist.
- Detail routes: `/bikes/:id`, `/bikes/:id/maintenance`, `/bikes/:id/strava-link`, `/bikes/:id/rides` —
  these mirror the backend `NotificationType.route` values so a notification tap maps straight to a screen.
- Public report route `/r/:token` is **outside** the authenticated shell (no nav, no login).
- **Adaptive shell:** one layout component renders bottom tabs on mobile and a sidebar on desktop
  (Mantine `AppShell` + `useIsDesktop()`), see [ADR 0035](adr/0035-the-desktop-layout-is-chosen-by-width.md).
  Sheets become side panels or modals on desktop, see [ADR 0036](adr/0036-on-desktop-a-sheet-is-a-panel-or-a-modal.md).

## 7. Notifications UX (recap)

- **In-app banner** when app is open (own React component / Mantine notifications).
- **System tray** when app is in background (rendered by Android via FCM).
- **Inbox** (DB) is the source of truth; push is just a signal to refetch.
- **Bell** in the top bar on mobile, a sidebar row on desktop; badge = unread count; shared `useUnreadCount` hook so a foreground push updates it.

## 8. Shared reports UX

- Lives on the **bike detail** ("Shared reports"), optionally a global "My reports".
- Each report row: created date, status (active/revoked/expired), view count, actions (copy link, PDF, revoke).
- Revoke = soft (revoked flag); public endpoint then returns 410.
- A report is a frozen snapshot — multiple reports per bike allowed (newest first).

## 9. Design system

- **Library:** Mantine — use its theme, components and hooks; avoid hand-rolled CSS where a component exists.
- **Brand palette:** derived from the logo — warm beige/tan + dark slate (extract exact hex from `Design/logo`,
  define as a Mantine theme color with 10 shades). Accent TBD.
- **Theme:** Mantine `MantineProvider` with a single theme; light/dark via `colorScheme` (Mantine built-in) later.
- **Responsive:** one `DESKTOP_QUERY` (60em) drives the switch — `useIsDesktop()`, Mantine `md`,
  Tailwind `desktop:`. Tailwind's own `md` (48rem) is a different width; don't use it in the app shell.
- **Tone:** clean, functional, sporty. No overengineering.

### Typography

The single source of truth for type. ADR 0039 records why.

**One typeface: Geist**, everywhere — app, public profile, print reports and setup dials. Loaded
once from Google Fonts in `index.html`; `theme.ts` and `--font-sans` point at it. There is no mono
face and no display face.

**Figures use `tabular-nums`**, not a different face, so columns of numbers and dates line up:
`className="tabular-nums"` on Mantine or Tailwind, `fontVariantNumeric: "tabular-nums"` in a
`styles` object.

**Weights: 400, 500, 600, 700.** Nothing else is loaded — no 100, no 800/900.

**Letter-spacing is a token, never a number.** Three tokens in `@theme` of `global.css`; the
default is `0`:

| Token                | Value   | When                                                         |
| -------------------- | ------- | ------------------------------------------------------------ |
| `--tracking-label`   | 0.08em  | uppercase ≤ 13px — labels, chips, eyebrows, button labels    |
| —                    | 0       | body text, and an uppercase title of 14–19px                 |
| `--tracking-title`   | -0.01em | 20–27px                                                      |
| `--tracking-display` | -0.02em | ≥ 28px                                                       |

```tsx
<Text fz={11} tt="uppercase" lts="var(--tracking-label)">…</Text>
<h2 className="text-[26px] tracking-title sm:text-[34px] sm:tracking-display">…</h2>
```

A heading whose size crosses a band at a breakpoint takes the token for each size. Inside an SVG,
use `style={{ letterSpacing: "var(--tracking-label)" }}` — a presentation attribute does not read
`var()`.

### Disabled buttons (pattern)

Always use this pattern for a button that can be blocked — the Mantine default disabled state is
unreadable on the dark background.

1. The boolean lives in the feature hook, not in the component:

```ts
// useAddBikeWizard.ts
const canAdvance = active === 0 ? canSearch : active !== 1 || isBikeSpecificationComplete(specification);
```

2. It is passed down as a prop (`canAdvance`, `canConfirm`, `canSave`…), never recomputed in the button.

3. The button gets `disabled={!can…}` **plus** the shared styles:

```tsx
import { disabledButtonStyles } from "../add_bike_page/formStyles";

<Button disabled={!canAdvance} styles={disabledButtonStyles} ... />
```

4. The look is defined once in `features/add_bike_page/formStyles.ts`:

```ts
export const disabledButtonStyles = {
  root: {
    "--mantine-color-disabled": "var(--mantine-color-cards-5)",
    "--mantine-color-disabled-color": "var(--mantine-color-text-9)",
  } as React.CSSProperties,
};
```

Reference: `features/add_bike_page/AddBikeFooter.tsx`.

### Disabled chips (pattern)

A `Chip` takes the same variables as the buttons above, on `root`:

```tsx
import { disabledChipStyles } from "../add_bike_page/formStyles";

<Chip
  disabled={picked === undefined}
  styles={disabledChipStyles}
  icon={picked === undefined ? false : undefined}
  ...
/>
```

```ts
export const disabledChipStyles = {
  root: {
    "--mantine-color-disabled": "var(--mantine-color-cards-5)",
    "--mantine-color-disabled-color": "var(--mantine-color-text-9)",
  } as React.CSSProperties,
};
```

Do not colour the `label` directly. Every checked rule in Mantine's `Chip.css` is gated on
`:not([data-disabled])`, so painting the label on top of a disabled chip buries whatever the
checked state was drawing.

`icon={false}` is for a chip that can be **checked while disabled** — a part preselected
before its action is ticked. The tick would claim a choice the user has not made yet.
Prefer it over hiding the icon with a colour: Mantine only renders the icon wrapper when an
icon exists, so `false` drops the reserved width too, while a transparent icon leaves a gap
where the tick would have been.

Reference: `features/add_service_page/ServiceActionsStep.tsx`.

### Menus (pattern)

Every `Menu.Dropdown` is dark. Mantine's default dropdown is white, so the styling must never be
left off:

```tsx
<Menu.Dropdown
  bg="cards.6"
  p={8}
  style={{ border: "1px solid var(--mantine-color-cards-6)", boxShadow: "var(--elev-panel)" }}
>
  <Menu.Item color="text" fw={600} leftSection={<Icon size={18} />}>…</Menu.Item>
</Menu.Dropdown>
```

- Items get `color="text"`. A destructive item gets `color="red.5"`, and a quiet one
  (for example `Nepřiřazovat`) gets `c="var(--color-text-dim)"`.
- Separate the item groups with
  `<Menu.Divider style={{ borderTopColor: "var(--mantine-color-cards-5)" }} />`. The default
  divider is light grey, drawn for a white dropdown.
- One rule in `global.css` (`[data-menu-item]`) sets the item hover to `cards.5` for every item,
  whatever its `color`. Don't override it per menu.

Reference: `features/components/ui/BikeComponentRow.tsx`, `features/strava/ui/PendingRidesTable.tsx`.

### Selects (pattern)

Every `Select` and `Autocomplete` takes the two shared props, never its own `styles`. The field
then reads like the quiet outline button and the dropdown like a `Menu.Dropdown` above:

```tsx
import { dropdownProps, inputStyles } from "@/features/add_bike_page/formStyles";

<Select radius="md" styles={inputStyles} comboboxProps={dropdownProps} … />
```

- `inputStyles`: `cards.7` field, `inputs.5` border, `text.6` — the same as `variant="outline"`.
- `dropdownProps`: `cards.6` dropdown, `p` 8, `--elev-panel`, options `fw` 600, portal at `zIndex` 350
  so it opens over sheets.
- One rule in `global.css` (`[data-combobox-option]`) sets the option hover and keyboard
  highlight to `cards.5`, as for menu items. Don't override it per select.
- No `size` prop: `inputStyles` fixes the height, so a select lines up with the other fields.

Reference: `features/bikes_page/BikesDesktop.tsx`, `features/strava/ui/PendingRideSheet.tsx`.

## 10. Frontend tech

- React + TypeScript, functional components + hooks (per project rules).
- **Mantine** (UI) + **React Router** (routing) + Mantine `AppShell` for the adaptive shell.
- **Capacitor** packages the same build as a mobile app.
- API via a small client; CapacitorHttp on device (avoids CORS) — switch to fetch/axios once CORS is set up (now enabled).
- Env: `VITE_API_BASE_URL` (already in place).

## 11. Open questions / TODO

- [ ] Audience: single rider only, or organizations/teams (backend has `organizations`)?
- [ ] MVP scope: which screens ship first? (proposed: Bikes → Bike detail.)
- [ ] Extract brand colors from logo; build the Mantine theme; pick accent.
- [ ] Rides feed: include AI summary cards from MVP, or per-bike only first?
- [ ] PDF: server-rendered (Puppeteer) vs client-side — decide when reports UI is built.
- [ ] Auth on frontend (login screen) — currently no login; FCM token send is temp-hardcoded to user 1.
