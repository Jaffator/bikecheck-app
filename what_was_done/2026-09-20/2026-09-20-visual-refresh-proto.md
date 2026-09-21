# Visual refresh prototype

Branch `proto/visual-refresh`, cut from `feat/public-profile` at `9da2723`. **Nothing is
committed** — review the diff, keep what earns its place, discard the rest with git.

Seen running: every screen below was screenshotted headless on this branch at 412×915
(Pixel) and 1440×900. `tsc -p tsconfig.app.json` and eslint are clean on the touched
files (the six eslint errors in the repo predate the branch).

Before/after in [`shots/`](shots/).

---

## What was wrong

1. **Home had no thesis.** First card was social stats (followers · views), then Strava,
   then "2 bikes are not paired" with a full-width button, and only fourth the one thing
   the app is for — what needs service. Half a screen of void under it.
2. **The attention ramp collided with the brand.** The 60 % stop was Tailwind yellow
   `#EAB308` beside brand mustard `#cec053` — warning and accent indistinguishable. The
   overdue red `#EF4444` sat at **3.92:1** on `cards.6`, under the 4.5:1 floor
   `docs/ui/card-surface.md` sets. The "good" green `#4ADE80` was neon on a muted palette.
3. **No browser layout.** At 1440 px a `BikeCard` was a 1400 px photo and a progress bar
   ran 1300 px. `docs/design.md` promises a sidebar; there was not even a max width.
4. **Rows you could not tell apart.** "Pad replacement 92 %" twice, meta line
   `CANYON STRIVE 2020 · BRAK…` truncated — the bike name on every row ate the room the
   part needed.
5. `EXTENDED  WEAR INDEX` read as one phrase.
6. Tab bar mixed three icon families (Octicons, Phosphor, Remix) with visibly different
   stroke weights.
7. Reports: two filled primary buttons per card × two cards = four primaries on screen.
8. `CZK 0` was the boldest thing on a free service row.
9. `0 KM · 0 M · 0 H` on an unpaired bike read as a bug.
10. The `+` FAB was anonymous, hid a menu, and covered the "Good" badge / "View all history".
11. Space Grotesk was loaded from Google Fonts and used by nothing (`font-display` never
    resolved to a token).

## What changed

### A. Home

| File | | |
|---|---|---|
| `dashboard_page/GarageStrip.tsx` | new | horizontal snap strip of bike chips: `BikePhoto` at 260 px, `HealthBadge`, tap → bike detail; dashed "Add bike" hook at the end; right-edge fade mask |
| `dashboard_page/StatusRow.tsx` | new | Strava · Connected, Pair gear (opens `GearLinkingSheet`), Unassigned rides (→ `/rides?tab=pending`), Garage · Public (opens `ShareDrawer`, Off → `/follows`) as small `--elev-row` tiles; 2-up on a phone, 1-up in the browser side column; never hides sharing (#135) |
| `dashboard_page/Dashboard.tsx` | edited | order: strip → Strava pitch (only when not connected) → `AttentionCard` (`AllGoodCard` when empty) → status tiles; `SimpleGrid` 2 columns from `sm` |
| `service_tracking/ui/AttentionCard.tsx` | edited | garage list grouped by bike, bike named once as an eyebrow, rows get `prefix={null}` so the meta line has room for the part |

The old `DashboardShareCard`, `UnpairedBikesCard`, `PendingRidesDashCard` and the
connected `StravaStatusCard` strip are no longer rendered on Home but still exist (the
share card still serves the empty-garage state; Settings still uses `StravaStatusCard`).

### B. Ramp, icons, small things

| File | |
|---|---|
| `service_tracking/attentionLevel.ts` | ramp → `#E8A33C` (60, amber, 6.83:1) · `#F0803A` (70) · `#F07B66` (90) · `#F26B5B` (100, 4.94:1); quiet → `#8FCB9B` sage. Every stop clears 4.5:1 on `cards.6` |
| `service_tracking/ui/TrackedActionRow.tsx` | `EXTENDED` is a 9 px pill on a 14 % primary tint |
| `layout/AppLayout.tsx` | Home/Rides/Chat tabs → lucide `House` / `Route` / `MessageCircleMore`, stroke 1.75 resting / 2.5 active; the app's own bike + service marks keep their filled twins |
| `report/ui/ReportCard.tsx`, `CopyLinkButton.tsx`, `ExportSheet.tsx` | Copy link is the quiet outline on the list (accent only in the icon); the sheet passes `color="primary.5"` explicitly to keep its look |
| `service/ui/ServiceHistoryCard.tsx` | a zero price drops to `text-dim` / 400 |
| `bikes/ui/BikeCard.tsx` | all-zero figures → one line `bikes.noRidesYet` beside the pairing hint |
| `index.html`, `theme.ts` | Space Grotesk dropped; headings are Inter; Inter 700 and JetBrains Mono 700 added to the font request (the app already uses both weights) |

New i18n keys (cs + en): `bikes.noRidesYet`, `strava.unpairedTile_*`,
`pendingRides.tileDetail_*`. `fab.open` is now unused.

### C. Browser column

| File | |
|---|---|
| `layout/contentWidth.ts` | new — `CONTENT_MAX_WIDTH = 44rem`, `BAR_WIDTH` |
| `layout/AppLayout.tsx` | header contents, the routed page and the tab bar all sit in the column |
| `bikes_page/Bikes.tsx` | `SimpleGrid` 2 columns from `sm` |
| `layout/Fab.tsx` | right offset follows the column edge |

Not a sidebar. A phone-and-a-half column is the cheapest thing that stops the
stretch; the sidebar `docs/design.md` describes is still open.

### D. FAB

`layout/Fab.tsx` rewritten: a labelled pill (`+ Add service` on Home and Service,
`+ Add bike` on Bikes), no menu, no dim overlay in `AppLayout`. Home's "Add bike" moved
to the strip's dashed hook. Positioned with a plain fixed `Box` — Mantine `Affix`
mangles a `max()` offset.

## If this is adopted

- `docs/ui/card-surface.md` — add the strip chip and the status tile as uses of
  `--elev-panel` / `--elev-row`; note the browser column.
- `docs/design.md` §9 — record the ramp values and the one-family rule.
- Remove `fab.open` from both locales; delete `DashboardShareCard`'s `StateCard` half if
  the tile replaces it for good.
- `BikeCard` and `GarageStrip` both draw a health pill over `BikePhoto`; a shared
  `BikeChip` would be the next extraction, not done here (ask first per the card doc).

## Not touched, but seen

- Two "Pad replacement" rows still look identical: `position` is null in this data, so
  the side never reaches the label. Data, not UI.
- Login gradient runs to a flat saturated yellow over the bottom half. Left alone — it
  is a choice, and a distinctive one.
- Chat, Rides, Settings, Notifications, Setup, Add bike, Add service: no changes.
