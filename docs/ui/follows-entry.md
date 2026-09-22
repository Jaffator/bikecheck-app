# Riders entry

Where the app leads to `/follows` (Following | Followers), the page now titled **Riders**
("Jezdci"). Decided on the wayfinder map
[Odkud se chodí na Sledování](https://github.com/Jaffator/bikecheck-app/issues/150); each
section links the ticket that holds the reasoning. Spec only — no implementation here.

## The main entry: the More tab

[#158](https://github.com/Jaffator/bikecheck-app/issues/158), replacing the top-bar icon of
[#153](https://github.com/Jaffator/bikecheck-app/issues/153)

| what    | decision                                                                                     |
| ------- | -------------------------------------------------------------------------------------------- |
| surface | the fifth tab, **More** — it takes the Chat tab's slot, so the bar still holds five (M3 max 5, Apple "More") |
| order   | `Home · Bikes · Service · Rides · More`                                                       |
| icon    | lucide `LayoutGrid`, the tab bar's own stroke weights; label `nav.more`                        |
| tap     | opens a bottom drawer, not a route — the tab has no screen of its own                          |
| target  | the drawer's Riders card → `/follows` (default tab Following), no state-dependent switching    |
| where   | the 5 main tabs only; nested pages keep back arrow + `actionSlot`                              |
| a11y    | the tab is `nav.more`; the card inside carries `page.follows` and, with pending requests, the count |

```
before:  BikeCheck      👥(2) 🔔(1)  👤
         🏠  🚲  ⚙️  🛣️  💬

after:   BikeCheck            🔔(1)  👤
         🏠  🚲  ⚙️  🛣️  ⊞•
                             More
```

The drawer follows `docs/conventions/drawers.md` — slide-up, 400 ms, `radius="lg"`, no close
button. It registers in `useOverlayStore`, so the hardware back gesture closes it instead of
navigating. Its content is held to `CONTENT_MAX_WIDTH` so it sits in the column on desktop.

Two cards, and room to grow:

| card   | detail                                                            | right side           |
| ------ | ----------------------------------------------------------------- | -------------------- |
| Riders | `N followers · M requests` from `useMyProfile`                     | request count badge  |
| Chat   | "Ask about your bike"                                             | AI tag               |

`N followers · M requests` costs no extra request — `useMyProfile` is already loaded. The
count of people the user follows is deliberately not shown: the profile does not carry it and
the drawer is not worth a second call.

Both `/follows` and `/chat` are sub-pages: back arrow, no tab bar, back returns to whatever
the drawer opened over. Neither route changes.

**Chat gives up its front-row seat.** It moves from one tap to two and nothing else links to
it — no shortcut from a bike detail, none in the FAB menu. Deliberate; a shortcut goes in
where it turns out to be missed.

## The badge

[#155](https://github.com/Jaffator/bikecheck-app/issues/155), amended by
[#158](https://github.com/Jaffator/bikecheck-app/issues/158)

- **A dot on the tab, a number on the card.** The tab says only that something is inside —
  it will carry more rows than requests in time, and a number there would have to lie about
  what it counts. The Riders card holds the figure.
- **Counts PENDING follow requests only** — `profile.stats.pending_requests` from `useMyProfile`.
- **Clears on resolution** (✓ / ✗ on `/follows?tab=followers`), not on opening the drawer —
  pending requests are a fact, not "unread".
- **The bell stops holding the request.** `follow_request` loses `holdsBadge` in
  `notification-types.config.ts`; the bell becomes a receipt (clears on read), More the task
  (clears on resolution). `strava_activity_unassigned` keeps holding the bell.
- **New follower on a PUBLIC profile** is information, not a task — bell only.
- **Look:** the card's badge is a copy of the bell badge — `primary-6` pill, mono, `9+` cap.
  The tab's dot is `primary-6`, 7 px, top-right of the icon.

```
request arrives     bell 1   More •   card 1
open notifications  bell 0   More •   card 1
approve             bell 0   More     card —
```

## Today's entries

[#156](https://github.com/Jaffator/bikecheck-app/issues/156)

- **Home sharing tile → always the share drawer.** The OFF → `/follows` branch existed only
  because no other way in existed. Tile = "my sharing", More = "my people". Never hidden (#135).
- **"N requests" leaves the tile.** Detail = `OFF ? label : "12 followers · 40 views"`; the
  count lives on the More drawer's Riders card alone. `detailAccented` on the sharing tile
  goes with it.
- **Bikes header share icon removed.** Sharing lives on the Home tile, people in the More
  drawer; a fourth icon in the bar on one tab only was the old way in, not a place of its own.
- **Notifications unchanged.** `follow_request` / `new_follower` → `/follows?tab=followers`
  (a tap jumps to the event). `follow_accepted` → `/users/:handle` untouched.

## Naming

`page.follows` reads **Jezdci** / **Riders** — "Sledování" named an activity where the row
names people. The tabs inside the page (Sledovaní | Sledující) and the domain terms
(Follower, Follow Request) are unchanged, and so is `CONTEXT.md`: Riders is the name of a
screen, not a concept. `nav.chat` is gone; `nav.more` and the drawer's card keys are new.

## Files touched

| file                                                        | change                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------ |
| `layout/AppLayout.tsx`                                      | Chat tab → More tab with its dot; `Users` icon and badge removed; `/chat` becomes a sub-page |
| `layout/MoreDrawer.tsx`                                     | new — the two cards                                                 |
| `features/chat_page/Chat.tsx`                               | composer and empty-page heights no longer clear a tab bar           |
| `features/dashboard_page/StatusRow.tsx`                     | sharing tile always opens the drawer; requests line removed         |
| `features/profile/ui/DashboardShareCard.tsx` (empty garage) | same: Off row opens the drawer; Requests figure removed             |
| `features/bikes_page/Bikes.tsx`                             | header share icon gone; `profile/ui/HeaderShareIcon.tsx` deleted    |
| `hooks/usePushNotifications.ts`                             | foreground push also invalidates `PROFILE_ME_QUERY_KEY`             |
| `notification/notification-types.config.ts` (backend)       | `follow_request` drops `holdsBadge`                                 |
| `i18n/locales/{cs,en}.json`                                 | `page.follows` renamed; `nav.more` and the drawer's keys added      |
| `notifications/notificationRoute.ts`                        | none                                                                |

## Out of scope

People search, follow from a foreign profile, `/follows` page content, a feed for followers,
the rest of the design's More menu (Reports, Notifications, Setup, Settings, profile) —
see the map's Out of scope.
