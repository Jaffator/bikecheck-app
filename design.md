# BikeCheck — UI/UX Design

> Living design doc. Responsive app: mobile (Capacitor) + desktop web, one React codebase. Keep it lightweight — update as decisions are made.

## 1. What the app does

BikeCheck tracks bikes, their components and service history, and syncs data from Strava.
It computes mileage per component and health indexes for suspension, brake pads, chain and drivetrain.
The user picks from many event types to record a maintenance/service action, or creates a personal
service event. The owner can generate a shareable report (e.g. when selling a bike).

**Core user jobs**

- See my bikes, their mileage and health indexes ("garage").
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

Navigation is **adaptive** — same destinations, different chrome per screen size.
The top bar (everywhere) holds the **bell** (unread notifications) and the **user avatar**
(account menu). Neither notifications nor profile is a primary tab.

```
MOBILE                              DESKTOP
┌────────────────────────────┐      ┌──────────┬───────────────────────┐
│ BikeCheck        🔔(3)  👤 │      │ 🏠 Home  │ BikeCheck    🔔(3)  👤 │
├────────────────────────────┤      │ 🚲 Garage│                       │
│                            │      │ 🔧 Service│    (active screen)    │
│      (active screen)       │      │ 📋 Rides │                       │
├──────┬──────┬──────┬───────┤      └──────────┴───────────────────────┘
│🏠    │🚲    │🔧    │📋     │
│Home  │Garage│Servic│Rides  │  (Home/Garage/Service/Rides; sidebar on desktop)
└──────┴──────┴──────┴───────┘

🔔 Bell (top bar, everywhere) → opens Inbox as a Drawer/Modal (not a tab)
   └─ Notification list → navigate by notification.route ; mark read
👤 Avatar (top bar, everywhere) → account menu (not a tab):
   Profile, Strava account, notification settings, organization, logout

🏠 Home (Dashboard) — landing screen after login
   ├─ Needs attention (service due + health alerts)
   ├─ Last ride (AI summary + rating)
   ├─ Quick stats (bikes count, total km)
   └─ Primary action button → "+ Log service" ("+ Add bike" when garage is empty)

🚲 Garage (Bikes)
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
| Garage        | List of bikes (image, name, total km, health badge)                 | Tap bike → detail; "+ Add bike" |
| Bike detail   | Components w/ mileage & health, service history, rides, Strava, reports | Generate report, mark service   |
| Service       | Due/soon items **+ record a service event** (category → event → auto-filled actions/components → note + cost) | Log event; mark done / snooze |
| Rides         | Recent rides feed across bikes, with AI summary + rating            | Open ride detail                |
| Inbox (bell)  | Notifications (unread first), grouped by date — opens as drawer     | Navigate via `route`; mark read |
| Account (avatar) | Profile, Strava connection, notification prefs — opened from avatar menu | Connect Strava, logout      |
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

- Tab destinations: `/home`, `/garage`, `/service`, `/rides`. Landing after login = `/home`.
- Inbox opens from the **bell** as a Drawer/Modal over the current screen (no own tab); deep-linkable as `/inbox` if needed.
- Account (`/profile`, settings, Strava, logout) opens from the **avatar menu** in the top bar — not a tab.
- Detail routes: `/bikes/:id`, `/bikes/:id/maintenance`, `/bikes/:id/strava-link`, `/bikes/:id/rides` —
  these mirror the backend `NotificationType.route` values so a notification tap maps straight to a screen.
- Public report route `/r/:token` is **outside** the authenticated shell (no nav, no login).
- **Adaptive shell:** one layout component renders bottom tabs on mobile and a sidebar on desktop
  (Mantine `AppShell` + `useMediaQuery`).

## 7. Notifications UX (recap)

- **In-app banner** when app is open (own React component / Mantine notifications).
- **System tray** when app is in background (rendered by Android via FCM).
- **Inbox** (DB) is the source of truth; push is just a signal to refetch.
- **Bell** in the top bar everywhere; badge = unread count; shared `useUnreadCount` hook so a foreground push updates it.

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
- **Responsive:** Mantine breakpoints + `useMediaQuery` drive the mobile/desktop layout switch.
- **Tone:** clean, functional, sporty. No overengineering.

## 10. Frontend tech

- React + TypeScript, functional components + hooks (per project rules).
- **Mantine** (UI) + **React Router** (routing) + Mantine `AppShell` for the adaptive shell.
- **Capacitor** packages the same build as a mobile app.
- API via a small client; CapacitorHttp on device (avoids CORS) — switch to fetch/axios once CORS is set up (now enabled).
- Env: `VITE_API_BASE_URL` (already in place).

## 11. Open questions / TODO

- [ ] Audience: single rider only, or organizations/teams (backend has `organizations`)?
- [ ] MVP scope: which screens ship first? (proposed: Garage → Bike detail.)
- [ ] Extract brand colors from logo; build the Mantine theme; pick accent.
- [ ] Rides feed: include AI summary cards from MVP, or per-bike only first?
- [ ] PDF: server-rendered (Puppeteer) vs client-side — decide when reports UI is built.
- [ ] Auth on frontend (login screen) — currently no login; FCM token send is temp-hardcoded to user 1.
