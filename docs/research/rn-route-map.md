# BC-5 — RN equivalent for the Strava route map

Research for issue #28 (child of map #23). Verified 2026-08-28 against Expo SDK 57.

## Headline

**The ticket's premise needs one correction, and it changes the answer.**
`components/RouteMap.tsx` does **not** render into a web map. It renders an inline `<svg>`
with a single `<path>` — no tiles, no map SDK, no network. Its own comment says so:

> `// Renders a route outline without map tiles or network requests.`
> — `_frontend/bikecheck/src/components/RouteMap.tsx:52`

So the RN equivalent is **`react-native-svg`**, not a mapping library.
That answer is *better* on every axis the ticket cares about: no API key on either
platform, no provider divergence, no Google/Apple split, works in Expo Go, and the iOS
story is identical to the Android one.

The mapping-library question is still answered below (section 4), because #23 will
eventually want to know it — but it is a **future feature decision**, not a port task.

| | Recommendation |
|---|---|
| **Port RouteMap.tsx as it behaves today** | `react-native-svg` — 0 keys, 0 accounts, Expo Go OK, iOS identical to Android |
| **If a real tiled map is ever wanted** | `react-native-maps` (not `expo-maps` — see 4.2) |
| **`utils/polyline.ts`** | Ports **unchanged**. Verified line by line, section 5 |

---

## 1. What the current component actually is

Read in full: `_frontend/bikecheck/src/components/RouteMap.tsx` (106 LOC),
`_frontend/bikecheck/src/utils/polyline.ts` (~110 LOC).

Pipeline: `decodePolyline(polyline)` → `toViewPoints()` (equirectangular projection into a
fixed `0 0 100 100` viewBox, longitude corrected by `cos(mean latitude)`) →
`simplifyPath()` (Ramer–Douglas–Peucker) → `toPath()` (an `M`/`L` SVG `d` string) →
one `<path>`.

There is no basemap, no geographic tiles, no camera, no zoom, no interaction. It is a
**route glyph**, used at two sizes:

| Call site | Size | Notes |
|---|---|---|
| `features/rides/CompletedRides.tsx:27` | 50×50 | list thumbnail, `simplify={CARD_SIMPLIFY}` |
| `features/rides/RideDetailSheet.tsx:78` | 100%×140 | `strokeWidth={3}`, no simplify — "Every point Strava gave us" |
| `features/strava/PendingRidesCard.tsx:27` | 50×50 | list thumbnail |
| `features/strava/PendingRideSheet.tsx` | detail | same shape as RideDetailSheet |

A tiled map would be a **redesign**, and #23 puts redesign out of scope ("Parity is with
today's UI"). Swapping in `react-native-maps` here would also regress the thumbnails: a
50×50 tile-backed MapView in an infinite-scrolling list means four native map surfaces per
screen, all making network requests, to draw something the SVG draws for free.

---

## 2. Recommended: `react-native-svg`

**Library:** `react-native-svg` (Software Mansion), npm `react-native-svg@15.15.5`
(verified `registry.npmjs.org/react-native-svg/latest`). Peer deps are `react: *`,
`react-native: *`.

**Expo status** — from Expo's own SDK page (`docs.expo.dev/versions/latest/sdk/svg/`,
documenting SDK **57.0.0**):

- Install: `npx expo install react-native-svg`
- **Included in Expo Go** — no development build needed to run it
- Platforms listed: **Android, iOS**, macOS, tvOS, Web

**Dev-build implication: none.** This is the whole point. It is bundled in Expo Go, and in
an EAS build it is an autolinked native module with no config plugin, no `app.json` keys,
no Info.plist entry, no manifest entry, no signing-dependent registration.

### 2.1 Prop-by-prop port map

| Web (`RouteMap.tsx`) | RN | Verified |
|---|---|---|
| `<svg viewBox="0 0 100 100">` | `<Svg viewBox="0 0 100 100">` | USAGE.md documents `viewBox` |
| `preserveAspectRatio="xMidYMid meet"` | same prop, same string | documented in USAGE.md |
| `<path d=… fill="none" stroke=…>` | `<Path d=… fill="none" stroke=…>` | core primitive |
| `strokeLinecap="round"` | `strokeLinecap="round"` | allowed: `butt` / `square` / `round` |
| `strokeLinejoin="round"` | `strokeLinejoin="round"` | allowed: `miter` / `bevel` / `round` |
| `vectorEffect="non-scaling-stroke"` | `vectorEffect="non-scaling-stroke"` | **supported** — see 2.2 |
| `<Box w= h=>` (Mantine) | `<View style={{ width, height }}>` | — |
| `RouteOff` from `lucide-react` | `lucide-react-native@1.35.0` | peer-deps on `react-native-svg ^12–^15` ✔ matches 15.15.5 |
| `useMemo`, TS types, all math | unchanged | pure React |

### 2.2 The three real gotchas

1. **`vectorEffect` is supported, with a caveat.** The prop is declared in the library's
   own types — `src/lib/extract/types.ts` declares
   `vectorEffect?: 'none' | 'non-scaling-stroke' | 'nonScalingStroke' | 'default' | 'inherit' | 'uri'`.
   But there is an **open upstream Android issue**
   ([#2000, "vectorEffect makes native view too big (Android)"](https://github.com/software-mansion/react-native-svg/issues/2000))
   and a memory-leak report ([#1436](https://github.com/react-native-svg/react-native-svg/issues/1436))
   for `non-scaling-stroke` under a transformed parent `<G>`. I did **not** run this, so
   treat it as *supported but worth eyeballing on device*. Fallback if it misbehaves: drop
   `vectorEffect` and scale `strokeWidth` per call site — the component already takes
   `strokeWidth` as a prop, and there are only two distinct sizes.

2. **CSS custom properties do not exist in RN.** `stroke="var(--mantine-color-strava-6)"`
   and `color="var(--color-text-dim)"` must become literal colours from whatever the
   `_mobile/` theme turns out to be. This is a design-system dependency, not a mapping one
   — it belongs to whichever ticket fixes the RN theme.

3. **`aria-hidden` → RN accessibility.** Use `accessibilityElementsHidden` (iOS) +
   `importantForAccessibility="no-hide-descendants"` (Android), or simply leave the `<Svg>`
   unlabelled; RN does not expose SVG children to the a11y tree by default.

Nothing else in the file touches the DOM.

---

## 3. Per-platform / per-key matrix for the recommendation

| | Android | iOS |
|---|---|---|
| Renderer | Android Canvas via `react-native-svg` | Core Graphics via `react-native-svg` |
| API key | **none** | **none** |
| Cloud account | **none** | **none** |
| Paid membership | **none** | none *for rendering* (Apple Developer Program is still needed to ship to the App Store at all — unrelated to this component) |
| Expo Go | yes | yes |
| Dev build | not required | not required |
| Config plugin | none | none |

**This is the answer to "can one provider serve both": there is no provider.** The route
glyph is drawn from data the backend already returns (`summary_polyline`), by the same
code, on both platforms. The Android-only-rework risk that #28 was written to guard
against does not exist on this path.

---

## 4. If a tiled map is ever wanted (future, not this port)

Two candidates. Both put **Google Maps on Android, Apple Maps on iOS** by default — that
default is the crux of the iOS half of this ticket.

### 4.1 `react-native-maps` — the one to pick

- npm `react-native-maps@1.29.0`; peer deps `react >= 18.3.1`, `react-native >= 0.76.0`
  (verified `registry.npmjs.org/react-native-maps/latest`).
- **Actively maintained** — v1.29.0 (2026-06-28) added *"ios fabric support (GoogleMaps
  Marker, Polygon)"*; 1.27.x in Feb/Mar 2026. README: *"This project is being maintained by
  a small group of people."* No deprecation notice. New Architecture: **1.26.1+ requires
  RN >= 0.81.1**; 1.26.0 and below require RN >= 0.76.
- **Bundled in Expo Go** for SDK 57 — the Expo page carries `inExpoGo: true` and says
  *"No additional setup is required when testing your project using Expo Go"*, followed by
  *"to deploy the app binary on app stores additional steps are required for Google Maps."*
- Expo config plugin requires **react-native-maps >= 1.22 and Expo SDK >= 53**
  (`react-native-maps/docs/installation.md`).
- Draws the existing route directly: `<Polyline coordinates={…} />` fed from
  `decodePolyline()` output mapped to `{latitude, longitude}` — `polyline.ts` stays useful
  even on this path.

**Providers and keys:**

| | Android | iOS default | iOS with `provider={PROVIDER_GOOGLE}` |
|---|---|---|---|
| Map engine | Google Maps (only option) | **Apple Maps / MapKit** | Google Maps SDK for iOS |
| API key | **required** | **none** | **required — a second, separate key** |
| Where it goes | plugin option `androidGoogleMapsApiKey` | — | plugin option `iosGoogleMapsApiKey` |
| Key restriction | package name **+ SHA-1 fingerprint** | — | **bundle identifier** |
| Extra account | Google Cloud project, Maps SDK for Android enabled | — | same Cloud project, Maps SDK for **iOS** also enabled |

```json
{
  "expo": {
    "plugins": [
      ["react-native-maps", {
        "androidGoogleMapsApiKey": "YOUR_KEY_HERE",
        "iosGoogleMapsApiKey": "YOUR_KEY_HERE"
      }]
    ]
  }
}
```
(verbatim shape from `react-native-maps/docs/installation.md` and the Expo SDK page.)

**Can one provider serve both platforms?** Yes — Google, via
`provider={PROVIDER_GOOGLE}` on `<MapView>` on iOS as well. But "one provider" does **not**
mean one key: it means **two API keys from one Google Cloud project**, two SDKs enabled
(Maps SDK for Android *and* Maps SDK for iOS), and two different restriction schemes
(package + SHA-1 vs bundle id). The SHA-1 part matters operationally — an Android key
restricted to the Play upload/signing certificate will silently render a grey map for a
locally-signed dev build unless the dev build's own SHA-1 (from EAS credentials) is added
too. Expo's docs call this out as its own step.

Doing nothing on iOS is also a legitimate choice: leave `provider` unset, get Apple Maps,
get **zero keys and zero Google billing exposure** on iOS. The cost is that the two
platforms then look different.

**Cost:** Google's pricing page lists the native mobile "Maps SDK" SKU (6DE1-4D9C-5B67) as
**Unlimited** with no per-tier price — i.e. no charge and no 10k/month cap of the kind the
web *Dynamic Maps* SKU carries. A billing account on the Cloud project is still required
even for a $0 SKU. Apple Maps through native MapKit needs no key at all; the key/JWT
machinery people associate with Apple Maps belongs to **MapKit JS** (web) and the Maps
Server API, which do need an Apple Developer Program membership, a Maps ID and a private
key — not applicable to a native RN app.

### 4.2 `expo-maps` — rejected

- npm `expo-maps@57.0.2`, first-party Expo. Description: *"Provides a Map component that
  uses Google Maps on Android and Apple Maps on iOS."*
- Expo's own docs: *"This library is currently in alpha and will frequently experience
  breaking changes."*
- **Not available in Expo Go — requires a development build.**
- **iOS requires iOS 17+**, and some features (marker callbacks, programmatic selection)
  require **iOS 18+**.
- **It cannot do Google Maps on iOS at all.** Expo's docs: while Google ships a Maps SDK
  for iOS, *"Expo Maps supports it exclusively on Android"*, and points anyone needing it
  to another library.
- Android key goes in `android.config.googleMaps.apiKey` (not a plugin option, unlike
  react-native-maps); Apple Maps needs no setup.

Rejected on three counts against #23's constraints: alpha with declared breaking changes,
an iOS 17 floor, and a hard ceiling on ever unifying the two platforms on one provider.

---

## 5. `utils/polyline.ts` — ports unchanged ✔ confirmed

Read in full. It exports `LatLng`, `Point`, `decodePolyline`, `simplifyPath`.

- **Imports: none.** Zero import statements in the file.
- **DOM/browser globals: none.** No `document`, `window`, `navigator`, `Element`, `Canvas`,
  `atob`, `URL`.
- **Node globals: none.** No `Buffer`, `process`.
- Everything it touches is ECMAScript core available in Hermes: `String.prototype.charCodeAt`,
  bitwise ops (`|=`, `&`, `>>`, `~`, `<<`), `Math.min/max`, `Array.prototype.map/filter/push/pop`,
  `Uint8Array`, exponentiation `**`.
- No recursion — RDP uses an explicit stack (`const stack: [number, number][]`), so no
  stack-depth risk on dense routes regardless of engine.
- No `any`, explicit return types throughout — already compliant with `CLAUDE.md`.

**Verdict: copy the file into `_mobile/` byte-for-byte.** It is the only part of this
component that needs no thought at all. It also survives a later move to
`react-native-maps` — `decodePolyline` is exactly what feeds a `<Polyline coordinates>`.

`RouteMap.tsx` itself is the opposite: everything it does *around* the maths is
presentation, and all of it changes.

---

## 6. Recommended shape for the port ticket

1. Copy `utils/polyline.ts` → `_mobile/src/utils/polyline.ts`, unchanged.
2. Rewrite `RouteMap.tsx` against `react-native-svg`: `Box`→`View`, `svg`→`Svg`,
   `path`→`Path`, `lucide-react`→`lucide-react-native`, CSS vars → theme literals,
   `aria-hidden` → RN a11y props. `toViewPoints`, `toPath`, `useMemo`, the props interface
   and every comment carry over verbatim.
3. Check `vectorEffect` on a physical Android device (issue #2000); fall back to
   per-size `strokeWidth` if it misbehaves.
4. Add **no** map keys, **no** config plugin, **no** `app.json` entries.

If a real map is later wanted for the detail sheet only, it is an additive ticket, and
section 4.1 is its starting point.

---

## 7. What I could not verify

- **`vectorEffect` behaviour on device.** Type support and the open Android issue are both
  documented; I could not build or run either platform from here.
- **Whether `PROVIDER_GOOGLE` works inside Expo Go on iOS.** Expo says react-native-maps is
  bundled in Expo Go and needs no setup there, but no page I read states whether the
  Google Maps iOS pod is present in the Expo Go binary. Expect it not to be, and verify
  before relying on it — this only matters if section 4.1's Google-on-both path is taken.
- **Apple's own page stating native MapKit needs no key.** `developer.apple.com/maps/`
  does not address it, and the two MapKit-JS token docs I tried returned 404. The
  no-key-for-native claim rests on Expo's and react-native-maps' documentation (Apple Maps
  = "no additional configuration needed") plus the fact that Apple's key documentation is
  scoped to MapKit JS / Maps Server API. Confident, but not from Apple's own words.
- **Google's pricing table** was read through a summarising fetch, not scraped cell by
  cell. Re-check the SKU line before anyone commits to Google-on-iOS.
- Nothing here was run on iOS hardware — per #23, nothing in this map does.

## Sources

Primary, all fetched 2026-08-28:

- Expo SDK 57 — react-native-svg: https://docs.expo.dev/versions/latest/sdk/svg/
- Expo SDK 57 — react-native-maps (MapView): https://docs.expo.dev/versions/latest/sdk/map-view/
  and source `expo/docs/pages/versions/unversioned/sdk/map-view.mdx`
- Expo SDK 57 — expo-maps: https://docs.expo.dev/versions/latest/sdk/maps/
  and source `expo/docs/pages/versions/unversioned/sdk/maps.mdx`
- react-native-maps installation doc: https://github.com/react-native-maps/react-native-maps/blob/master/docs/installation.md
- react-native-maps README + releases: https://github.com/react-native-maps/react-native-maps/releases
- react-native-svg `src/lib/extract/types.ts` (`VectorEffect` type) and `USAGE.md`:
  https://github.com/software-mansion/react-native-svg
- react-native-svg issues #2000, #1436
- npm registry: `react-native-svg@15.15.5`, `react-native-maps@1.29.0`, `expo-maps@57.0.2`,
  `lucide-react-native@1.35.0`
- Google Maps Platform pricing: https://developers.google.com/maps/billing-and-pricing/pricing
- Apple: https://developer.apple.com/maps/ ,
  https://developer.apple.com/help/account/capabilities/create-a-maps-identifier-and-private-key/ (MapKit JS scope)

Repo sources: `_frontend/bikecheck/src/components/RouteMap.tsx`,
`_frontend/bikecheck/src/utils/polyline.ts`, and the four call sites listed in section 1.
