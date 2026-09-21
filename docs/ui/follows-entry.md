# Follows entry

Where the app leads to `/follows` (Following | Followers). Decided on the wayfinder map
[Odkud se chodí na Sledování](https://github.com/Jaffator/bikecheck-app/issues/150); each
section links the ticket that holds the reasoning. Spec only — no implementation here.

## The main entry: a top-bar icon

[#153](https://github.com/Jaffator/bikecheck-app/issues/153)

| what     | decision                                                                                   |
| -------- | ------------------------------------------------------------------------------------------ |
| surface  | top bar, next to the bell — global, carries a badge, no sixth tab (M3 max 5, Apple "More") |
| order    | `[Users] [bell] [avatar]` — least-used icon furthest from the thumb's corner               |
| icon     | lucide `Users`, 25px, `cards-1` — same style as the bell; no text label                    |
| target   | always `/follows` (default tab Following), no state-dependent switching                    |
| where    | the 5 main tabs only, like the bell and avatar; nested pages keep back arrow + `actionSlot` |
| a11y     | `aria-label` = `page.follows` ("Sledování" / "Following"); with pending requests append the count, e.g. "Sledování, 3 žádosti" (the bell stays a bare label) |

```
before:  BikeCheck            🔔(3)  👤
after:   BikeCheck      👥(2) 🔔(1)  👤
```

Desktop needs nothing extra — the top bar is already capped at `CONTENT_MAX_WIDTH`, so the
icon sits in the column by itself.

## The badge

[#155](https://github.com/Jaffator/bikecheck-app/issues/155)

- **Counts PENDING follow requests only** — `profile.stats.pending_requests` from `useMyProfile`.
  A number, not a dot: the bell in the same bar already speaks in numbers.
- **Clears on resolution** (✓ / ✗ on `/follows?tab=followers`), not on opening the page —
  pending requests are a fact, not "unread".
- **The bell stops holding the request.** `follow_request` loses `holdsBadge` in
  `notification-types.config.ts`; the bell becomes a receipt (clears on read), Users the task
  (clears on resolution). `strava_activity_unassigned` keeps holding the bell.
- **New follower on a PUBLIC profile** is information, not a task — bell only.
- **Look:** a copy of the bell badge — `primary-6` pill, mono, `9+` cap, top-right of the icon.
  Pull the inline badge out of the bell into a shared piece.

```
request arrives     bell 1   Users 1
open notifications  bell 0   Users 1
approve             bell 0   Users 0
```

## Today's entries

[#156](https://github.com/Jaffator/bikecheck-app/issues/156)

- **Home sharing tile → always the share drawer.** The OFF → `/follows` branch existed only
  because no other way in existed. Tile = "my sharing", Users = "my people". Never hidden (#135).
- **"N requests" leaves the tile.** Detail = `OFF ? label : "12 followers · 40 views"`; the
  count lives on the Users badge alone. `detailAccented` on the sharing tile goes with it.
- **Notifications unchanged.** `follow_request` / `new_follower` → `/follows?tab=followers`
  (a tap jumps to the event). `follow_accepted` → `/users/:handle` untouched.

## Files touched

| file                                                         | change                                                         |
| ------------------------------------------------------------ | -------------------------------------------------------------- |
| `layout/AppLayout.tsx`                                       | Users icon + badge before the bell; badge shared with the bell |
| `features/dashboard_page/StatusRow.tsx`                      | sharing tile always opens the drawer; requests line removed    |
| `features/profile/ui/DashboardShareCard.tsx` (empty garage)  | same: Off row opens the drawer; Requests figure removed        |
| `hooks/usePushNotifications.ts`                              | foreground push also invalidates `PROFILE_ME_QUERY_KEY`        |
| `notification/notification-types.config.ts` (backend)        | `follow_request` drops `holdsBadge`                            |
| `i18n/locales/{cs,en}.json`                                  | `aria-label` variant with count (reuses `page.follows`)        |
| `notifications/notificationRoute.ts`                         | none                                                           |

## Out of scope

People search, follow from a foreign profile, `/follows` page content, a feed for followers —
see the map's Out of scope.
