# RN UI library for the BikeCheck port — confirm or replace gluestack

Research for issue #26 (BC-3), child of map #23.
All facts verified 2026-08-28 against npm registry, the GitHub APIs of the owning repos, and the projects' own docs. Every claim below carries its source.

---

## Verdict

**Replace the gluestack assumption. Recommend `react-native-reusables` (RNR) on the stable NativeWind 4 track**, with three named fills for what it does not ship.

The gluestack assumption is not wrong about the *style* of library — it is wrong about *which* library and about *which gluestack*. The premise in the ticket ("v1 runtime styled-system, v2 NativeWind copy-in") is itself already two majors stale: **gluestack-ui v5 is the current stable release** and it is again a different library from v2.

The design constraint (`theme.ts` Figma ramps) does **not** separate the two candidates — both theme identically, via CSS variables in a `global.css` plus Tailwind classes on components whose source lives in our repo. Neither fights custom theming. So the decision falls to foundation stability, and there RNR wins clearly.

---

## 1. Where gluestack actually stands, as of 2026-08-28

### Version history — four architectures in ~16 months

Source: GitHub releases API, `repos/gluestack/gluestack-ui/releases`.

| Tag | Published | What it was |
|---|---|---|
| `@gluestack-ui/themed@1.1.73` | 2025-04-08 | last v1 publish — runtime styled-system |
| `v2.0.10` | 2025-07-28 | NativeWind copy-in |
| `v3.0.0` | 2025-08-12 | |
| `v4.0.0-alpha` | 2026-01-28 | never reached stable |
| `v5.0.0-alpha.0` | 2026-03-16 | |
| **`v5.0.0` — "🚀 gluestack-ui v5 - Stable Release"** | **2026-06-25** | **current** |

The v1 package `@gluestack-ui/themed` (npm registry) has `latest = 1.1.73`, last published **2025-04-08** — frozen for ~16 months. A v1 tutorial is not merely misleading, it documents an abandoned package. A **v2** tutorial is now also misleading: v2 is three majors back.

Repo is alive: `pushed_at` **2026-08-26** (two days ago), 5,272 stars, not archived (GitHub API).

### v5 architecture

From the v5.0.0 release notes verbatim:

> - **NativeWind v5 Integration**: We now fully leverage NativeWind v5 (Tailwind v4) …
> - **Expo Router First** …
> - **Next.js Support Dropped**: Because NativeWind v5 currently does not support Next.js … we have officially dropped Next.js support.

Confirmed by the v5 install docs (gluestack.io/ui/docs/home/getting-started/installation): `npx gluestack-ui@latest init`, prerequisites Expo ≥ 50 / RN ≥ 0.72.5, styling engine chosen at init between **"NativeWind v5 — Tailwind CSS v4 + PostCSS"** and **"UniWind — Expo-only, Tailwind CSS v4, no PostCSS"**, and: *"Web is not currently supported"*, *"gluestack-ui v5 does not currently support Next.js"*.

Delivery model — verified against the repo, not the docs: `apps/starter-kit-expo/app/index.tsx` imports `from '@/components/ui/box'`, and `apps/starter-kit-expo/components/ui/` holds all ~57 component folders. So **components are copied into the consuming repo**, backed by headless npm packages `@gluestack-ui/core` + `@gluestack-ui/utils`. Styling is `tva` (tailwind-variants) over shadcn-shaped semantic tokens — from `src/components/ui/button/index.tsx`:

```
variant: {
  default: 'bg-primary data-[hover=true]:bg-primary/90 …',
  secondary: 'bg-secondary text-secondary-foreground …',
  outline: 'border border-border bg-background …',
}
```

Theming is `global.css` CSS variables as space-separated RGB channels (`apps/starter-kit-expo/global.css`):

```css
:root {
  --primary: 23 23 23;  --primary-foreground: 250 250 250;
  --card: 255 255 255;  --secondary: 245 245 245;
  --background: 255 255 255; --muted: …; --border: …; --input: …; --accent: …;
}
@media (prefers-color-scheme: dark) { :root { … } }
```

### The disqualifying finding: "stable" v5 sits on pre-release foundations

npm registry, `nativewind`:

- `latest` = **4.2.6**, published 2026-06-22
- `preview` = **5.0.0-preview.4**, published **2026-05-15** (3.5 months ago)
- newest nightly: 2026-07-08

**NativeWind v5 has never been published to `latest`.** Yet gluestack's own current Expo starter (`apps/starter-kit-expo/package.json`) pins:

```json
"@gluestack-ui/core": "^5.0.15-alpha.0",
"@gluestack-ui/utils": "^5.0.6-alpha.0",
"nativewind": "^5.0.0-preview.2",
"@legendapp/list": "^3.0.0-beta.43",
"resolutions": { "lightningcss": "1.30.1" },
"overrides":   { "lightningcss": "1.30.1" }
```

An alpha range on its own core, a preview styling engine, a beta list, and a hand-pinned `lightningcss` in both `resolutions` and `overrides`. That is a fragile base under a ~13,900 LOC port that will run for months.

The escape hatch (UniWind) is not currently maintained to the same level: `apps/starter-kit-expo-uniwind/package.json` is on `expo: ^55.0.0-preview.9` / `react-native: 0.83.1` — a whole Expo major behind the NativeWind starter (Expo 56 / RN 0.85.3).

Docs are also visibly trailing the code. The public docs page for Button still documents the v4 API (`action` / `variant` / `size`, `gluestack-ui/config`), while the v5 source ships shadcn variants. Recent commits are literally `fix: align docs and examples with v5 component props` (2026-08-10). Working from gluestack docs today means routinely hitting v4 instructions against v5 code.

---

## 2. What the app actually uses

Measured against `_frontend/bikecheck/src` on branch `feat/service`, 2026-08-28. 61 files import `@mantine/*` (matches the map's figure).

### Package-level truth — most of the Mantine surface is vestigial

Only **four** `@mantine/*` packages are imported anywhere in `src`:

| Package | Import sites |
|---|---|
| `@mantine/core` | 60 files |
| `@mantine/form` | 3 files |
| `@mantine/dates` | 1 file (+ its CSS in `main.tsx`) |
| `@mantine/hooks` | 1 file (`useToggle`) |

**Zero import sites** for: `@mantine/carousel`, `@mantine/notifications`, `@mantine/modals`, `@mantine/charts`, `@mantine/tiptap`, `@mantine/dropzone`, `@mantine/spotlight`, `@mantine/nprogress`, `@mantine/code-highlight` — nor for their transitive companions `recharts`, `embla-carousel`, `embla-carousel-react`, `@tiptap/*`.

This corrects two assumptions in the ticket:

- **Carousel is not in play.** The swipe between the Completed/Pending ride tabs is hand-rolled: `src/hooks/useSwipePanels.ts` + `src/features/rides_page/Rides.tsx` (a `translate3d` track with touch handlers). `@mantine/carousel` is an unused dependency.
- **Notifications are not in play.** `src/components/InAppNotification.tsx` is a hand-written `Paper` + its own `InAppNotification.css`, driven by `@capacitor/push-notifications`. `@mantine/notifications` is an unused dependency.
- **`@mantine/tiptap` and `@mantine/charts` are confirmed vestigial** — as suspected in the ticket. So are 7 more.

Net: **~11 dependencies must not be ported at all.** That is the cheapest finding in this ticket.

### Component-level inventory (`@mantine/core`, by number of importing files)

| Count | Component | RNR | gluestack v5 |
|---|---|---|---|
| 47 | `Stack` | View / flex classes | `vstack` |
| 46 | `Text` | `text` | `text` |
| 43 | `Group` | View / flex classes | `hstack` |
| 28 | `Button` | `button` | `button` |
| 25 | `Box` | View | `box` |
| 20 | `Paper` | `card` | `card` |
| 15 | `Loader` | RN `ActivityIndicator` | `spinner` |
| 13 | `UnstyledButton` | RN `Pressable` | `pressable` |
| 7 | `ActionIcon` | `button` + `icon` | `button` + `icon` |
| 5 | `Drawer` (all `position="bottom"`) | **✗ gap** | `drawer` / `bottomsheet` / `actionsheet` |
| 5 | `Image` | `expo-image` | `image` |
| 5 | `Modal` | `dialog` | `modal` |
| 5 | `TextInput` | `input` | `input` |
| 4 | `Divider` | `separator` | `divider` |
| 4 | `Select` | `select` | `select` |
| 4 | `Skeleton` | `skeleton` | `skeleton` |
| 4 | `Title` | `text` variant | `heading` |
| 3 | `Chip` | ✗ compose | ✗ compose |
| 3 | `Textarea` | `textarea` | `textarea` |
| 2 | `Anchor` | ✗ compose | `link` |
| 2 | `Avatar` | `avatar` | `avatar` |
| 2 | `Card` | `card` | `card` |
| 2 | `Checkbox` | `checkbox` | `checkbox` |
| 2 | `FileButton` | ✗ `expo-image-picker` | ✗ `expo-image-picker` |
| 2 | `NumberInput` | `input` + `keyboardType` | `input` + `keyboardType` |
| 2 | `ScrollArea` | RN `ScrollView` | `scroll-view` |
| 1 each | `Affix` | absolute View | `fab` |
| | `Alert` | `alert` | `alert` |
| | `AppShell` | expo-router `_layout` | `safe-area-view` |
| | `Autocomplete` | ✗ compose | ✗ compose |
| | `Badge` | `badge` | `badge` |
| | `Center` | flex classes | `center` |
| | `Menu` | `dropdown-menu` | `menu` |
| | `PasswordInput` | `input` + `secureTextEntry` | same |
| | `Progress` | `progress` | `progress` |
| | `Radio` | `radio-group` | `radio` |
| | `SegmentedControl` | `tabs` | `tabs` |
| | `SimpleGrid` | flex/grid classes | `grid` |
| | `Slider` | ✗ (primitive exists, no ui file) | `slider` |
| | `Stepper` | ✗ compose | ✗ compose |
| | `Switch` | `switch` | `switch` |
| | `Tabs` | `tabs` | `tabs` |
| | `MantineProvider` | `ThemeProvider` | `gluestack-ui-provider` |

Plus `@mantine/dates`: `DatePickerInput` + `DatesProvider` (1 file, `features/service/PeriodFilterModal.tsx`).

### The two real gaps

**(a) Forms — a gap in *both* libraries.** Neither `gluestack/form-control` nor RNR's `label`/`input` is a form engine; they are presentational slots. `@mantine/form` is a state + validation library and has no counterpart in either candidate.

Mitigation is small, because the usage is shallow. Three call sites (`login_page/Authentication.tsx`, `add_bike_page/useAddBikeWizard.ts`, `add_bike_page/BikeIdentityForm.tsx`) and the whole API surface touched is `values`, `setFieldValue`, `errors`, `clearErrors`, `onSubmit`, and the `validate` config. `react-hook-form` covers all of it. This is the biggest *conceptual* gap and the cheapest to close.

**(b) Bottom sheets — the gap specific to RNR.** RNR ships 32 components (`packages/registry/src/nativewind/components/ui/`): `accordion alert-dialog alert aspect-ratio avatar badge button card checkbox collapsible context-menu dialog dropdown-menu hover-card icon input label menubar popover progress radio-group select separator skeleton switch tabs text textarea toggle-group toggle tooltip`. No bottom sheet, no drawer, no calendar/date picker, no toast, no slider UI, no table UI, no carousel.

That collides with the app's most characteristic pattern: **five bottom `Drawer`s** — `CustomTagDrawer`, `RideDetailSheet`, `ServiceDetailSheet`, `GearLinkingSheet`, `PendingRideSheet` — alongside five `Modal`s. This is the single largest coverage gap of the recommendation. It is fillable with one named library (below), which is precisely what gluestack v5 itself does.

For reference, gluestack v5 ships ~57 components (`src/components/ui/`), including `drawer`, `bottomsheet`, `actionsheet`, `modal`, `calendar`, `date-time-picker`, `select`, `form-control`, `toast`, `fab`, `slider`, `table`. Its coverage advantage over RNR is real — but its `bottomsheet/dependencies.json` is `@gorhom/bottom-sheet: ^5` and its `date-time-picker/dependencies.json` is `@react-native-community/datetimepicker: ^8.4.4`. The advantage is a pre-written wrapper around libraries we can add directly, worth days, not weeks.

---

## 3. The theming constraint — a tie, and easier than feared

`_frontend/bikecheck/src/theme.ts` defines nine 10-shade Figma ramps (`primary` base `#cec053`, `secondary` `#e2c0aa`, `background`, `cards`, `cards2`, `inputs`, `strava` `#ff5f1f`, `text`, `textDark`) plus 12 flat `otherColor` tokens, on `Inter` / `Space Grotesk`.

Crucially, the app **already consumes these as CSS variables**, not as Mantine props — ~250 `var(--mantine-color-*)` reads across `src`, led by `--mantine-color-primary-6` (46), `--mantine-color-cards-6` (35), `--mantine-color-text-6` (31), `--mantine-color-strava-6` (29). And it already speaks Tailwind: **395 `className=` occurrences across 36 `.tsx` files**.

Both candidates theme through exactly that mechanism, so the ramps port near 1:1 as named CSS variables rather than being collapsed into shadcn's semantic roles:

- `--mantine-color-primary-6: #cec053` → `--primary-6: 206 192 83`
- `--mantine-color-cards-6: #242222`, `cards-7: #171616` → `--cards-6`, `--cards-7`
- `--mantine-color-strava-6: #ff5f1f` → `--strava-6: 255 95 31`

NativeWind v4 (stable) supports this: colors declared as `rgb(var(--color-…) / <alpha-value>)` in the Tailwind config, values in CSS, plus `vars()` and runtime theme switching (nativewind.dev/docs/guides/themes, v4). NativeWind v5 and UniWind carry the same model with Tailwind v4 `@theme`.

**Conclusion: theming does not discriminate between the candidates.** Both are "copy the source into our repo, style with Tailwind classes over our own CSS variables" — the model with the least resistance to a Figma palette. It does, however, decisively rule out the alternatives that *would* fight it (below).

---

## 4. Alternatives considered and rejected

| Candidate | Status verified | Why not |
|---|---|---|
| **gluestack-ui v5** | `v5.0.0` 2026-06-25; repo pushed 2026-08-26; 5.3k ★ | Best coverage, but mandates NativeWind v5 **preview** (`latest` is 4.2.6); own starter pins alpha/preview/beta deps + `lightningcss` overrides; four architectures in 16 months; docs trailing code; web dropped. |
| **react-native-reusables** | repo pushed 2026-07-02; 8.6k ★; `@react-native-reusables/cli` 0.7.1 (2026-03-14) | **Recommended.** See below. |
| **Tamagui** | `tamagui` 2.7.7, 2026-08-15; `3.0.0-beta.765.1` on `beta` | Its own compiler + `createTheme` token DSL — a second styling system fighting the Tailwind vocabulary the app already writes in (395 classNames). Also a v3 beta in flight. Rejected on the design constraint. |
| **React Native Paper** | 5.15.3, 2026-05-26; `6.0.0-alpha.0` on `alpha` | Material Design 3, JS theme object, opinionated component chrome. Reskinning MD3 into the `#cec053`/`#171616` Figma look is exactly the "library that fights custom theming" the constraint warns against. Rejected. |
| **Raw RN + NativeWind, no component library** | — | Viable fallback, but re-implements Select, Dialog, Tabs, DropdownMenu accessibility from scratch. RNR is that plus the primitives. |

---

## 5. Recommendation

**Adopt `react-native-reusables` on the NativeWind 4 track.**

Verified facts behind the choice:

- **Stable foundation.** `packages/registry/package.json` depends on `nativewind: ^4.2.2` — the published `latest` — with `uniwind: ^1.6.3` as the alternate engine (`uniwind` `latest` = **1.11.0**, published **2026-08-17**, a healthy stable 1.x). No pre-release in the critical path.
- **Equally current runtime.** Same registry: `react-native 0.85.3`, `react 19.2.3`, `expo-router ~56.2.11` — i.e. Expo 56 / RN 0.85, identical to gluestack's starter. RNR is not the conservative choice because it is behind; it is behind on *nothing*.
- **Same ownership model.** `npx @react-native-reusables/cli@latest init`, then `add button` → the source lands at `@/components/ui/button` (docs `installation/index.mdx`). Upstream churn cannot break a file we own. This mutes the "gluestack rewrites itself" argument for gluestack too — but does nothing about NativeWind v5 preview, which is a *toolchain* dependency, not a copied file.
- **Accessible primitives underneath.** `@rn-primitives/*` 1.5.2 (30 packages, latest published 2026-07-02), a Radix port described by its own repo as *"Style-agnostic, accessible React Native components for iOS, Android, and Web"*; repo `roninoss/rn-primitives` pushed 2026-08-08, not archived.
- **Community depth.** 8,626 stars vs gluestack's 5,272.
- **Familiar conventions.** shadcn naming and composition, which the repo's `docs/ui/` surface conventions can sit on without translation.

### Named fills for the gaps

| Gap | Fill | iOS verified |
|---|---|---|
| 5 bottom `Drawer`s + sheet UI | `@gorhom/bottom-sheet` v5 — the same library gluestack v5's `bottomsheet` wraps | repo `gorhom/react-native-bottom-sheet`, 9.1k ★, pushed 2026-05-09, iOS+Android |
| `DatePickerInput` (1 site) | `@react-native-community/datetimepicker` — the same library gluestack v5's `date-time-picker` wraps | repo `react-native-datetimepicker/datetimepicker`, description *"React Native date & time picker component for **iOS**, Android and Windows"*, pushed 2026-08-14 |
| `@mantine/form` (3 sites) | `react-hook-form` | pure JS, platform-agnostic |
| `Carousel`, `Notifications` | **nothing** — already hand-rolled (`useSwipePanels`, `InAppNotification`); port the existing code | n/a |
| `Chip`, `Stepper`, `Autocomplete`, `Affix`, `SegmentedControl` | compose from RNR primitives (1–3 sites each) | n/a |
| `FileButton` (2 sites) | `expo-image-picker` / `expo-document-picker` | Expo, iOS+Android |

### Standing iOS constraint — confirmed

Every element of this recommendation is iOS-capable, verified at the moment of choice:

- **RNR** is `nativewind`/`uniwind` + `@rn-primitives`, whose own repo states iOS, Android and Web support. RNR's registry has no Android-only dependency.
- **NativeWind 4** and **Uniwind** are Metro/Babel-level styling transforms — no native platform surface, iOS unaffected.
- **`@gorhom/bottom-sheet`** and **`@react-native-community/datetimepicker`** both ship iOS implementations (the latter says so in its own repo description).
- **`react-hook-form`**, **`expo-*` pickers** — iOS first-class.

No Android-only library enters the stack.

Worth recording for the map: **gluestack v5 dropped web support entirely**, while RNR remains universal (`react-native-web` is a peer dependency of its registry). Irrelevant to this map — the Capacitor web build stays untouched — but choosing RNR keeps the door open, and choosing gluestack v5 closes it.

### Concrete revisit trigger

Reconsider gluestack v5 when **`npm view nativewind version` returns a 5.x** (i.e. NativeWind v5 reaches the `latest` dist-tag) **and** `@gluestack-ui/core`'s stable range stops pointing at `-alpha` versions. Both are one-command checks. Until then the coverage advantage does not pay for the pre-release foundation.

---

## 6. Sources

Verified 2026-08-28.

**npm registry** (`registry.npmjs.org`, `dist-tags` + `time`)
- `@gluestack-ui/themed` — `latest` 1.1.73, published 2025-04-08
- `@gluestack-ui/core` — `latest` 5.0.15, published 2026-06-25
- `@gluestack-ui/nativewind-utils` — `latest` 1.0.28, 2025-08-26
- `@gluestack-ui/select`, `@gluestack-ui/actionsheet` — v1-era, last published 2025-02/2025-04
- `nativewind` — `latest` **4.2.6** (2026-06-22), `preview` 5.0.0-preview.4 (2026-05-15)
- `uniwind` — `latest` 1.11.0 (2026-08-17)
- `@react-native-reusables/cli` — `latest` 0.7.1 (2026-03-14)
- `@rn-primitives/select` — `latest` 1.5.2 (2026-07-02)
- `tamagui` — `latest` 2.7.7 (2026-08-15), `beta` 3.0.0-beta.765.1
- `react-native-paper` — `latest` 5.15.3 (2026-05-26), `alpha` 6.0.0-alpha.0

**GitHub API**
- `repos/gluestack/gluestack-ui` — pushed 2026-08-26, 5,272 ★; `/releases`; `/releases/tags/v5.0.0` body; `/contents/src/components/ui`; `/contents/src/components/ui/button/index.tsx`; `/contents/apps/starter-kit-expo/{package.json,global.css,app/index.tsx,components/ui}`; `/contents/apps/starter-kit-expo-uniwind/package.json`; `/contents/src/components/ui/{bottomsheet,calendar,date-time-picker}/dependencies.json`
- `repos/founded-labs/react-native-reusables` — pushed 2026-07-02, 8,626 ★; `/contents/packages/registry/package.json`; `/contents/packages/registry/src/nativewind/components/ui`; `/contents/apps/docs/content/docs/{index,customization,installation/index}.mdx`
- `repos/roninoss/rn-primitives` — pushed 2026-08-08, 933 ★
- `repos/nativewind/nativewind` — pushed 2026-07-17, 8,066 ★
- `repos/gorhom/react-native-bottom-sheet` — pushed 2026-05-09, 9,080 ★
- `repos/react-native-datetimepicker/datetimepicker` — pushed 2026-08-14, 2,907 ★

**Project docs**
- `gluestack.io/ui/docs/home/getting-started/installation` — v5 prerequisites, engine choice, "Web is not currently supported"
- `gluestack.io/ui/docs/components/all-components` — v5 component roster
- `gluestack.io/ui/docs/components/button` — **still documents the v4 API**; recorded as evidence of docs drift
- `nativewind.dev/docs/guides/themes` (v4) — CSS-variable colors, `vars()`, runtime theme switching

**This repo** (`_frontend/bikecheck`, branch `feat/service`, 2026-08-28)
- `package.json`, `src/theme.ts`, `src/main.tsx`
- import census over `src` (61 files with `@mantine/*`; 4 packages actually imported)
- `src/hooks/useSwipePanels.ts`, `src/features/rides_page/Rides.tsx` (hand-rolled carousel)
- `src/components/InAppNotification.tsx` (hand-rolled notifications)
- `src/features/{add_service_page/CustomTagDrawer,rides/RideDetailSheet,service/ServiceDetailSheet,strava/GearLinkingSheet,strava/PendingRideSheet}.tsx` (the five bottom drawers)
- `src/features/service/PeriodFilterModal.tsx` (the single `@mantine/dates` site)
- `src/features/{login_page/Authentication,add_bike_page/useAddBikeWizard,add_bike_page/BikeIdentityForm}.tsx` (the three `@mantine/form` sites)
