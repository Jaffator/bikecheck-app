# Bike photo upload, wizard completion and the Bikes tab

Branch `feat/add-bike-steps-2-3`, on top of commit `38c4a9f`.

**Nothing here is committed.** All of it can be discarded with git if it is not
wanted. 33 files edited, 12 new. Most of the line count sits in generated files
(`schema.d.ts`, `package-lock.json`, `bikecheckapi_schema.json`) and is not
hand-written.

**Never seen running.** The dev server was not started at any point, so none of
the UI below has been looked at. Typechecks and lint pass; that says nothing
about how any of it renders.

---

## 1. Photo upload to Cloudflare R2

`POST /bike/create` is now multipart. The `data` field carries the DTO as a JSON
string, `image` carries an optional file. A photo picked on the device wins over
a scraped URL; a scraped URL is downloaded and re-uploaded to R2, so `image_url`
in the database is always an R2 URL.

Images are normalised before storage: EXIF rotation applied, resized to max
1600px wide, converted to webp q80. A 4032x3024 original comes out roughly 20x
smaller.

| File | | Role |
|---|---|---|
| `bike.controller.ts` | edited | `FileInterceptor`, manual multipart validation |
| `bike.service.ts` | edited | `storeFile()` beside `storeFileFromUrl()` |
| `storage.service.ts` | edited | `uploadImageR2CloudFare()`, sharp pipeline |
| `api/client.ts` | edited | FormData must not get a JSON `Content-Type` — it destroys the multipart boundary |
| `bikes.api.ts` | edited | `createBike()`, `uploadFilename()` for nameless Capacitor blobs |

`sharp` was added to `_backend/package.json`.

### Broken / incomplete

- **The existing 7 MB photo is still 7 MB.** Resizing only applies to new
  uploads. Fixing the ones already in R2 needs a one-off script over
  `bikes.image_url`.
- **`CLOUDFARE_PUBLIC_URL` typo** (missing L) survives on one line in
  `storage.service.ts` — a `console.log`. The `return` uses the correct
  `CLOUDFLARE_PUBLIC_URL`, so the URL itself is right, but the log prints
  `undefined`.

---

## 2. Finishing the add-bike wizard

Step 3 gained a "Save the bike" button. It opens a summary modal listing the bike
and every component that will be written, with an edit/confirm pair. On success
the wizard is replaced by a full-screen confirmation built from the Figma design
(node `2115-1477`) — circular check mark, bike name, and a Continue button that
leads to `/bikes`.

| File | | Role |
|---|---|---|
| `AddBikeSummaryModal.tsx` | new | 195 lines |
| `BikeAddedScreen.tsx` | new | 97 lines |
| `bike_added_check.svg` | new | from Figma, `fill` rewritten to `currentColor` |
| `useAddBikeWizard.ts` | edited | +206 lines: payload mapping, mutation, save state |
| `AddBikeFooter.tsx` | edited | `showsSave` / `onSave` |
| `store.ts` | edited | `chromeHidden` — collapses header and tab bar |

Also fixed: step 3 used to open already scrolled down, because a step change
keeps the route and therefore the scroll position. Reset on every step change.

### Broken / incomplete

- **Component names in validation errors do not work.** `sentComponents` plus
  `namedSaveErrors()` are written and typecheck, and the intent is to turn
  `components.21.component_desc: ...` into `Rim (Front): ...`. In testing only
  the first error was rewritten. The cause was not found — the backend was
  verified to send four separate array entries, and the frontend reads
  `error.details` correctly, so the fault is somewhere in between. Work was
  stopped here on request.

---

## 3. Step 2 — new fields

Two inputs under the photo: bike name (free text) and current mileage (digits
only, maps to `total_km`). Both optional, so neither blocks the Next button.

`frame_material` was removed from the create DTO and the payload type.

### Decision needed

`frame_material` was left **in the database and in `ResponseBikeDto`** — only the
create path dropped it. `BikeCard` displays it, so it will be blank on every bike
created from now on. Either put it back in the create flow or stop showing it.

---

## 4. Bikes tab

The "BIKES PAGE" placeholder is replaced by a list of bike cards: photo with a
health badge, name, brand line, mileage and hours, and wear bars. Cards are
tappable and open `/bikes/:id`.

| File | | Role |
|---|---|---|
| `BikeCard.tsx` | new | 189 lines |
| `BikeDetail.tsx` | new | 75 lines, placeholder content |
| `bikeHealth.types.ts` | new | 37 lines, types with no data source yet |
| `Bikes.tsx` | edited | list, skeletons, error state |
| `AppLayout.tsx` | edited | detail treated as a sub-page via regex, because a `/bikes` prefix would also match the list |
| `bikes.queries.ts` | edited | `useBike` seeds from the cached list, so opening a bike shows no spinner |

Photos use `loading="lazy"`, matching `BikeSearchResults.tsx`.

### Broken / incomplete

- **The wear bars have no data.** The API exposes no aggregated wear per bike —
  `health_index` exists only on a mounted component. `BikeCard` renders the
  section only when passed `readings`, and nothing passes them today, so the
  section is absent and the badge reports "Good" for every bike. Wiring it up is
  one place in `Bikes.tsx` once an endpoint exists.
- **The brand line is a guess.** The design shows category and suspension
  ("Road · Full Suspension"), but `ResponseBikeDto` carries only `bike_type_id`,
  not the type name. Brand plus frame material is shown instead.
- The design was taken from a screenshot, not from Figma — the Figma API was
  rate-limited (429) for the whole session, so exact spacing and shades may
  differ from `node-id=2068-419`.

---

## 5. Database and validation

| What | Change | Why |
|---|---|---|
| `schema.prisma` | 3 relations `NoAction` → `Cascade` | A bike with service history could not be deleted at all |
| migration | `20260817120000_cascade_mounted_component_children` | **Not yet run** |
| `bike_type_id` | replaced by `bike_type` (name) | The client cannot know the id; the service resolves it |
| `total_km` | `IsPositive` → `Min(0)` | A new bike has zero kilometres, which was rejected with a 400 |
| `bikename` | 30 → 100 chars | People write longer names |
| `bike_model` | 50 → 120 chars | Scraped names carry the full trim and colourway |
| `user_id`, `bike_id` | required → optional | The client does not send them; the server fills them in |

The three cascade fixes cover `action_done_component_map`, `suspension_setup` and
`tire_setup`. All three hang off `components_mounted`; fixing only the first would
have hit the next one immediately.

Validation failures are no longer a bare "400". The server now returns
`bike.total_km: total_km must not be less than 0` and the summary modal shows it.

**Note on cascade:** hard-deleting a bike now also deletes its service history.
`deleteSoft` is unaffected.

---

## 6. Page slide transitions

Opening settings, profile, notifications or a bike detail now pushes that page in
from the right while the page behind it gives way to the left. Going back
reverses it. Switching between the four tabs keeps the plain fade it always had.

**The header travels with the page.** The title, back arrow and the
profile/bell/settings icons slide in as one piece with the content, so the whole
screen moves together rather than the bar swapping instantly over a sliding body.
The bar itself — background, safe-area padding — stays put; only its contents
move, which is what keeps the status-bar area from flickering.

The direction is derived from the sub-page boundary, not from a navigation
history: entering a sub-page is "forward", leaving one is "backward", and
anything else (tab to tab, sub-page to sub-page) is a fade.

| File | | Role |
|---|---|---|
| `PageTransition.tsx` | new | 134 lines; holds the outgoing frame in the DOM for 260 ms |
| `global.css` | edited | +49 lines: `fadeOut` and four `pageSlide*` keyframes |
| `AppLayout.tsx` | edited | `useOutlet()` instead of `<Outlet />`; content and header both wrapped in `PageTransition` |

`PageTransition` is used twice with the same `pathname`, so the two run in
lockstep. The header passes `fillHeight`, because a fixed-height slot cannot take
its height from the incoming content the way a page can.

Two constraints shaped the implementation and are commented in place:

- The wrapper of the incoming page carries a `transform` **only while the
  animation runs**. A lingering transform makes that wrapper the containing block
  for any `position: fixed` child, which would displace `AddBikeFooter` on
  `/bikes/new`. This is the same trap the existing `fadeIn` comment warns about.
- `useOutlet()` replaced `<Outlet />` because an `<Outlet />` element is not a
  snapshot — it re-reads the router on every render, so the captured "outgoing"
  page would have rendered as the page that just replaced it, and the exit
  animation would have shown the wrong content.

### Broken / incomplete

- **Never seen running**, like everything else here. The timing (260 ms), the
  25% travel of the page underneath and the 0.6 opacity are guesses that have
  not been looked at on a device.
- **The exit animation is timed by `setTimeout`, not by `animationend`.** If the
  browser throttles the animation the outgoing frame is removed at 260 ms
  regardless of whether it finished.
- **Header and content are two independent animations, not one.** They are given
  the same pathname and the same duration, so they should stay together, but
  nothing synchronises them — if one starts a frame late they can visibly drift.
  Worth watching for specifically when you look at it.
- **No `prefers-reduced-motion` handling.** The slide plays regardless of the
  system setting. The pre-existing `fadeIn` had the same gap, so this is not a
  regression, but it is now a much larger movement.

---

## What is left

### For you to run

1. **Apply the migration.** Until then, deleting a bike with service history
   still fails.
   ```
   cd _backend
   npx prisma migrate deploy
   npx prisma generate
   ```
   A backup taken before these changes is at
   `~/db_backups/monolith_dev_2026-08-17_143228.dump` (local `monolith_dev`,
   31 tables, verified with `pg_restore -l`).

2. **Look at the UI.** Add-bike step 2 and 3, the summary modal, the
   confirmation screen and the Bikes tab have never been rendered.

3. **Re-run `gen:api`** with the server up. The generated schema is a revision
   behind again: `bike_type`, the removed `frame_material` and the new length
   limits are not in it. Frontend types are hand-written where it matters, so
   nothing is broken today, but they will drift.

### Decisions

- **Health data for the cards.** Needs an endpoint computing wear per bike.
  Until then the bars stay invisible.
- **`bike_type` in `ResponseBikeDto`** — needed for the card's brand line to
  match the design.
- **The scraper truncates descriptions only at the first newline**
  (`bike-data-scraper.service.ts`), which is why components arrive with 400+
  character descriptions. The limit was raised; the cause was not addressed.
- **Splitting this into commits.** It is currently one large block covering five
  separate concerns, which will be awkward to revert selectively. The page
  transitions (section 6) are the cleanest to split off — three files, touching
  nothing the other sections depend on.
- **Transition feel.** 260 ms, 25% travel and 0.6 opacity for the page underneath
  are picked, not designed. If there is a Figma spec for the motion, none was
  consulted.

---

## Verification

- Frontend: `npx tsc -b` exit 0, re-run after the section 6 changes. Note that
  plain `tsc --noEmit` checks **nothing** here — the root tsconfig is
  `"files": []` with project references. The page transitions were first checked
  with that useless command; `tsc -b` was then run and also passed.
- Backend: `npx tsc --noEmit -p apps/monolith/tsconfig.app.json` exit 0.
- ESLint on changed paths: exit 0.
- Storage unit tests: 4/4 pass.
- `bike.service.unit.test.ts`: 4 tests fail, and failed identically before these
  changes — a missing `PinoLogger` provider in the test module. Confirmed by
  stashing.
