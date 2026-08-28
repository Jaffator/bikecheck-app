# RN replacements for `recharts` and `react-easy-crop`

Research for #27 (BC-4), child of the React Native port map #23. Written 2026-08-28.
Versions and dates below were read from the npm registry and the GitHub API on 2026-08-28.

Context for versions: current Expo SDK is **57.0.0**, on **React Native 0.86**
([Expo SDK reference](https://docs.expo.dev/versions/latest/)).

## Answer in one table

| Web library | RN replacement | Dev build? | Native dep? | API rewrite? | iOS |
|---|---|---|---|---|---|
| `recharts` | **nothing to port today** — it is an unused dependency. When charts land: `react-native-gifted-charts` | No (Expo Go OK) | No (JS over `react-native-svg`) | Yes, but small — declarative components, same mental model | Yes |
| `recharts` (escalation path) | `victory-native` (Victory Native XL) | **Yes** | `@shopify/react-native-skia`, Reanimated, Gesture Handler | Yes, larger | Yes, iOS 14+ |
| `react-easy-crop` | `expo-image-crop-tool` + `expo-image-manipulator` | **Yes** (native module) | Mantis (iOS) / vanniktech android-image-cropper (Android) | Yes — and the interaction model changes | Yes, iOS 15.1+ |

---

## 1. `recharts` — the premise is wrong: it is a dead dependency

The ticket says recharts "drives the dashboard charts". It does not drive anything.

```
$ git grep -n "recharts\|@mantine/charts" -- ':!*/node_modules/*'
_frontend/bikecheck/package.json:28:    "@mantine/charts": "^9.4.1",
_frontend/bikecheck/package.json:56:    "recharts": "^3.9.2",
_frontend/bikecheck/package-lock.json: ...
```

No file under `_frontend/bikecheck/src` imports `recharts` or `@mantine/charts`. The only
`Chart` token in the whole source tree is the `LineChart` **icon** from `lucide-react` in
`_frontend/bikecheck/src/features/add_bike_page/StravaConnectScreen.tsx:4`.

`_frontend/bikecheck/src/features/dashboard_page/` contains exactly two files. `Dashboard.tsx`
renders `StravaStatusCard`, `UnpairedBikesCard` and `PendingRidesCard`; `EmptyDashboard.tsx`
renders a **PNG placeholder**, `@/assets/images/empty_dashboard_graph.png`. There is no chart
in the app, only a picture of one.

**Consequences for the port**

- Chart porting cost for parity with today's app: **zero**. `recharts` and `@mantine/charts`
  are installed-but-unused in the web app; nothing needs an RN equivalent for parity.
- `recharts` could not be carried over in any case: it peer-depends on `react-dom`
  (`recharts@3.10.1` peerDependencies: `react`, `react-is`, **`react-dom`**), which does not
  exist in React Native.
- Charts are clearly *intended* — `Design/dashboard/` holds dashboard mockups and the empty
  state shows a graph placeholder. So the choice below is worth making now even though no
  ticket has to execute it.

### Recommendation: `react-native-gifted-charts`

- `react-native-gifted-charts@1.4.78`, published 2026-08-10, MIT, 215 versions.
  Repo `Abhinandan-Kushwaha/react-native-gifted-charts`, last push 2026-08-10, 1362 stars,
  99 open issues, not archived.
- Peer deps: `react-native-svg`, `expo-linear-gradient` (or `react-native-linear-gradient`),
  `react`, `react-native`. The README's Expo install line is
  `npx expo install react-native-gifted-charts expo-linear-gradient react-native-svg`.
- **Cost: closest thing to a drop-in.** Pure JS drawing into `react-native-svg`; no native
  module of its own, no config plugin, no prebuild step. Both peer deps are Expo SDK packages
  marked "Included in Expo Go" (`react-native-svg`: Android, iOS, macOS, tvOS, Web;
  `expo-linear-gradient`: Android, iOS, tvOS, Web). So charts alone never force a dev build.
- Chart types available: Bar, Line, Area, Pie, Donut, Stacked Bar, Population Pyramid, Radar,
  Bubble, Scatter, Candlestick, plus combined bar+line — a superset of anything a bike
  dashboard needs.
- **API rewrite is real but shallow**: recharts composes children (`<LineChart><XAxis/><Line/>`),
  gifted-charts takes a `data` array plus props on one component (`<LineChart data={...} />`).
  Same declarative feel, different shape. Since no chart code exists, this "rewrite" is
  greenfield anyway.
- **Risk**: effectively a one-maintainer project (Abhinandan Kushwaha). Active, but the bus
  factor is one.

### Escalation path: `victory-native` (Victory Native XL)

Use only if a chart needs gesture-driven pan/zoom or 60fps animation over large series.

- `victory-native@42.0.0`, published 2026-08-25, MIT, 182 versions. Repo
  `FormidableLabs/victory-native-xl`, last push 2026-08-26, 1215 stars, 88 open issues.
  README states: "**Active:** Nearform is actively working on this project."
- Peer deps: `@shopify/react-native-skia >=2.6.0 <3.0.0`, `react-native-gesture-handler >=2.0.0`,
  `react-native-reanimated >=3.19.1`.
- Components: Cartesian chart with Line / Area / Bar / Scatter / Candlestick paths, Polar chart
  with Pie / Donut paths, animated paths, pan/zoom, chart gestures, headless rendering.
- **Cost: a dev build plus a native graphics stack.** `@shopify/react-native-skia@2.11.1`
  (2026-08-23) is not an Expo SDK package and is not in Expo Go — its own docs point Expo users
  at `yarn create expo-app my-app -e with-skia`, i.e. a prebuilt project. Expo's own guidance:
  "Expo Go … does not include all of the native code required to support every library"; a
  library with native directories needs a development build.
- Knock-on: Skia 2.11 peer-depends on `react-native-reanimated >=4.0.0` and
  `react-native-worklets >=0.7.0`, and **Reanimated 4.x works only with the New Architecture
  (Fabric)** per Software Mansion's docs. RN 0.86 / Expo SDK 57 defaults to the New
  Architecture, so this is a constraint to hold rather than a blocker.

### Rejected chart options

- `react-native-svg-charts` — **dead**. Latest `5.4.0` published **2020-04-14**, registry
  untouched since 2022, peer `react-native-svg ^6 || ^7` (current is 15.x). Do not use.
- `react-native-chart-kit` — `7.0.2` (2026-07-09) under a new `chart-kit` org, last push
  2026-08-12, 3109 stars, 7 open issues, peers `react >=19.1`, `react-native >=0.81`,
  `react-native-svg >=15.12.1`. Genuinely revived and Expo-Go-compatible, but it spent years
  abandoned under the previous owner and offers a narrower chart set than gifted-charts. Fine
  as a fallback, not the first pick.

---

## 2. `react-easy-crop` — what it actually does here

`_frontend/bikecheck/src/features/add_bike_page/PhotoCropModal.tsx` (117 LOC) plus its helper
`photoCrop.ts`:

- A Mantine `Modal` (`fullScreen`, app-themed) hosts an inline `<Cropper>` in a `45dvh` box.
- Fixed aspect: `PHOTO_ASPECT = 2` (the wide bike-card slot, also used by
  `features/bikes_page/BikePhoto.tsx`).
- Zoom 1–3 driven **two ways**: pinch/drag on the image, and a Mantine `Slider` beneath it
  ("one-handed and mouse-accessible zoom control"), with a `lucide-react` ZoomIn icon.
- `restrictPosition` keeps the frame filled; `onCropComplete` yields the crop rect in
  **source-image pixels**.
- Confirm calls `cropToFile(file, area)`: canvas `drawImage`, output capped at 1600px wide,
  `image/jpeg` at quality 0.9, original filename with a `.jpg` extension. Buttons are i18n'd
  (`addBike.cropTitle`, `addBike.cropBody`, `addBike.cropConfirm`, `action.back`) and the
  confirm button shows a loading state.
- The modal is mounted permanently in `AddBikeIdentity.tsx:268` so cropping survives wizard
  step re-renders; state comes from `useAddBikeWizard` (`photoToCrop`, `photoToCropUrl`,
  `cancelCrop`, `confirmCrop`).

### Recommendation: `expo-image-crop-tool` + `expo-image-manipulator`

- `expo-image-crop-tool@0.4.0` (published 2025-11-08), MIT, repo `bluesky-social/expo-image-crop-tool`,
  last push 2026-08-11, 62 stars, 16 open issues, not archived. It is a proper Expo module
  (`expo-module.config.json`, `ios/`, `android/`).
- API (`src/ExpoImageCropTool.types.ts`), verified in source:

  ```ts
  openCropperAsync({
    imageUri: string,
    shape?: "rectangle" | "circle",
    aspectRatio?: number,          // 2 — matches PHOTO_ASPECT
    format?: "jpeg" | "png",
    compressImageQuality?: number, // 0.9
    rotationEnabled?: boolean,
    rotationControlEnabled?: boolean, // iOS only
    cancelButtonText?: string,     // i18n hook
    doneButtonText?: string,       // i18n hook
  }): Promise<{ path, mimeType, size, width, height }>
  ```
- **iOS is real, not claimed**: `ios/ExpoImageCropTool.podspec` declares
  `:ios => '15.1', :tvos => '15.1'` and depends on `Mantis` (the Swift cropping UI);
  `ios/Cropper.swift` + `ios/ExpoImageCropToolModule.swift` are the implementation.
  Android side depends on `com.vanniktech:android-image-cropper:4.6.0`.
- **Cost: a development build.** It ships native directories, so it cannot run in Expo Go.
  It is autolinked as an Expo module, so `npx expo prebuild` / EAS handles it — no manual pod
  or Gradle edits — but Expo Go is off the table for the add-bike flow from that point on.
- The module does **not** cap output size, so keep an equivalent of `cropToFile`'s 1600px /
  JPEG-0.9 step with `expo-image-manipulator` (`57.0.14`, Expo SDK package, Android/iOS/tvOS/web,
  **included in Expo Go**): `.resize({ width: 1600 })` then
  `saveAsync({ format: SaveFormat.JPEG, compress: 0.9 })`.

### Does the interaction model survive? Partly — one control is lost

| Today (web) | With `expo-image-crop-tool` |
|---|---|
| Mantine full-screen modal, app-themed, with title + body copy | Native full-screen cropper UI, not themeable from the app |
| Pinch/drag **and** a Mantine zoom slider (1–3) | Pinch/drag only — **the slider disappears** |
| Fixed 2:1 via `aspect` | Fixed 2:1 via `aspectRatio: 2` — survives |
| Crop rect in source pixels → own canvas resize | Cropped file returned directly; resize is a separate manipulator step |
| Four i18n strings including title and body copy | Only `cancelButtonText` / `doneButtonText` are translatable |
| Works on `File` objects; upload posts a `File` | Works on URIs; upload becomes `FormData` with `{ uri, name, type }` |

If the zoom slider and the themed modal are considered parity-critical, the only way to keep
them is **option C** below.

### Alternatives considered

- **`expo-image-picker` `allowsEditing`** (free, in Expo Go) — **rejected, and it is the
  standing iOS constraint that kills it.** Expo's docs on the `aspect` option: "This is only
  applicable on Android, since on iOS the crop rectangle is always a square." A 2:1 bike photo
  cannot be framed on iOS with it. Android-only answer = failed answer.
- **`react-native-image-crop-picker@0.51.1`** (published 2025-10-21; repo last push 2026-01-21;
  6349 stars but **654 open issues**) — mature, iOS + Android, does pick-and-crop in one call
  with fixed `width`/`height` ratio or `freeStyleCropEnabled`. Costs more than the Expo module:
  it is not an Expo module, so it needs prebuild plus manual `Info.plist` entries
  (`NSPhotoLibraryUsageDescription`, optionally camera/microphone) and its README never mentions
  Expo. Slower release cadence. Use only if its all-in-one picker is wanted.
- **Option C — build the cropper (keeps today's UX exactly)**: `react-native-gesture-handler` +
  `react-native-reanimated` over `expo-image` for pan/pinch, a slider component for zoom, then
  `expo-image-manipulator`'s `crop({ originX, originY, width, height })` — the same
  source-pixel rectangle model `react-easy-crop` already hands to `cropToFile`, and
  `expo-image-manipulator` is in Expo Go on iOS and Android. This is the only path that keeps
  the themed modal, the zoom slider and all four translated strings, and it needs no dev build.
  The cost is that the pan/zoom-to-crop-rect math becomes app code (roughly 2–3× the current
  117 LOC) — against `CLAUDE.md`'s "no overengineering", but in favour of the map's
  "parity, not redesign".

**Suggested call:** `expo-image-crop-tool` for the port, with option C held in reserve if
losing the zoom slider is rejected during review.

---

## 3. Interaction with the background-removal service — none today

Checked as asked. `_backend/remove_bg/` is **not wired into the app**:

- `git grep` for `8080`, `remove-bg`, `removeBg`, `cutout` across `_frontend/bikecheck/src` and
  `_backend/apps/monolith/src` returns only unrelated hits (a comment in `BikePhoto.tsx`, a
  grey hex value in `theme.ts`).
- `_backend/remove_bg/remove-bg.mjs` is self-described as a "Smoke test for the self-hosted
  withoutbg background removal server", with hardcoded Windows input/output paths and
  `BASE_URL = 'http://localhost:8080'`. It is not referenced by `docker/` compose files.

So the crop replacement **does not interact with it**. Two forward-looking notes if it ever
lands in the photo flow:

1. The server takes raw image bytes on `POST /api/v1/remove-background?output=cutout|matte`
   and answers with a PNG. Both recommended crop paths produce a local file URI that
   `fetch`/`FormData` can post, so neither constrains that integration.
2. A cutout is a **PNG with alpha**; today's crop pipeline emits **JPEG** (no alpha). If
   background removal is added, order matters — remove background first, then crop as PNG.
   `expo-image-crop-tool` accepts `format: "png"`, and `expo-image-manipulator` can save PNG,
   so both stay viable. Whether the app intends to use this service at all is **not
   established anywhere in the repo** — treat as an open question, not a requirement.

---

## 4. iOS confirmation (standing constraint from #23)

| Package | iOS evidence |
|---|---|
| `react-native-gifted-charts` | Pure JS; its two peers are Expo SDK packages listing iOS: `react-native-svg` (Android, iOS, macOS, tvOS, Web, included in Expo Go) and `expo-linear-gradient` (Android, iOS, tvOS, Web, included in Expo Go). Repo carries `ios/` and `android/` demo harnesses. |
| `victory-native` / `@shopify/react-native-skia` | Skia docs: "iOS 14" and above; Android API 21+; tvOS, macOS also supported. |
| `expo-image-crop-tool` | `ios/ExpoImageCropTool.podspec`: `:ios => '15.1'`, dependency `Mantis`; Swift implementation present. README notes only `rotationControlEnabled` is iOS-only. |
| `expo-image-manipulator` | Expo docs: Android, iOS, tvOS, Web; included in Expo Go. |
| `expo-image-picker` `allowsEditing` | Runs on iOS but **fails the requirement** — iOS crop rect is always square. |

No recommendation in this note is Android-only.

## 5. What I could not verify

- **No explicit "iOS supported" sentence** in the `react-native-gifted-charts` README. iOS
  support is inferred from its peer dependencies (both iOS-supported) and the repo's `ios/`
  directory — not from a first-party claim.
- **Victory Native XL / Skia on Expo SDK 57 (RN 0.86) specifically.** Peer ranges allow it
  (`skia` peer `react-native >=0.78`; `reanimated@4.6.0` peer `react-native 0.83 - 0.87`), but
  I found no first-party statement naming SDK 57.
- **`expo-image-crop-tool` has no documentation site** — the README and the TypeScript types in
  the repo are the whole spec. 62 stars, 16 open issues; it is used by the Bluesky app but that
  is not a maintenance guarantee. Its Android UX (vanniktech cropper) versus its iOS UX (Mantis)
  will not look identical; I did not run either.
- **GitHub's API reports no license for `victory-native-xl`**; npm metadata and package.json say
  MIT. Minor discrepancy, unresolved.
- Whether the map intends dashboard charts at all, and of what type. `Design/dashboard/` mockups
  and `empty_dashboard_graph.png` imply yes, but nothing in code or in #23 states it.
- I did not verify the New Architecture setting of the future `_mobile/` app; Reanimated 4
  (required by Skia 2.x) rules out the old architecture.

## Sources

Primary, all read 2026-08-28:

- npm registry metadata (versions, publish dates, peer deps): `registry.npmjs.org` for
  `recharts`, `victory-native`, `react-native-gifted-charts`, `@shopify/react-native-skia`,
  `react-native-svg`, `react-native-chart-kit`, `react-native-svg-charts`,
  `react-native-image-crop-picker`, `expo-image-manipulator`, `expo-image-picker`,
  `react-native-reanimated`, `react-native-gesture-handler`, `expo-image-crop-tool`, `expo`.
- GitHub API repo metadata and file contents for `FormidableLabs/victory-native-xl`,
  `Abhinandan-Kushwaha/react-native-gifted-charts`, `chart-kit/react-native-chart-kit`,
  `bluesky-social/expo-image-crop-tool` (podspec, `android/build.gradle`, `src/*.types.ts`),
  `ivpusic/react-native-image-crop-picker`.
- Expo docs: <https://docs.expo.dev/versions/latest/> ,
  <https://docs.expo.dev/versions/latest/sdk/imagepicker/> ,
  <https://docs.expo.dev/versions/latest/sdk/imagemanipulator/> ,
  <https://docs.expo.dev/versions/latest/sdk/svg/> ,
  <https://docs.expo.dev/versions/latest/sdk/linear-gradient/> ,
  <https://docs.expo.dev/workflow/using-libraries/> ,
  <https://docs.expo.dev/develop/development-builds/introduction/>
- React Native Skia docs: <https://shopify.github.io/react-native-skia/docs/getting-started/installation/>
- Reanimated docs: <https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/>
- Victory Native docs: <https://nearform.com/open-source/victory-native/docs/> and the repo README.
- This repo: `_frontend/bikecheck/package.json`, `src/features/add_bike_page/PhotoCropModal.tsx`,
  `src/features/add_bike_page/photoCrop.ts`, `src/features/add_bike_page/AddBikeIdentity.tsx`,
  `src/features/dashboard_page/*`, `_backend/remove_bg/remove-bg.mjs`.
