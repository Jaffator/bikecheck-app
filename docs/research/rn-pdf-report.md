# BC-6 — RN equivalent for the A4 service report

Research for issue #29 (child of map #23). Verified 2026-08-28 against Expo SDK 57
(`expo@57.0.18`, published 2026-08-28).

## Headline

**The ticket's premise needs one correction, and it makes the port cheaper than it looks.**

The four files are **unwired design mockups with hardcoded mock data**. Not one of them is
imported anywhere, not one is mounted on a route, and none of them takes a prop. There is
also no `window.print()` call anywhere in `_frontend/bikecheck/src`.

So **there is no user trigger today**. The user cannot reach a service report in the web
app at all. What exists is: four static JSX drafts plus a real, working print stylesheet in
`global.css`. Porting them is not "reproduce a working feature" — it is "build the feature,
using the drafts as the visual spec".

Second correction: `ServiceReportA4_Multiple.tsx` is **byte-identical** to
`ServiceReportA4_Single.tsx` (`diff` returns nothing). The "hard case" the ticket asks
about — A4 pagination across many Services — was never attempted in that file. The only
file that thinks about pagination is `ServiceReportMobile_Mutliple.tsx`, via eight
`break-inside-avoid` classes.

| | Recommendation |
|---|---|
| **Library** | `expo-print` (`printToFileAsync`), first-party, in Expo Go |
| **Renders from** | An **HTML string**, not React components. No RN option renders components to PDF |
| **Page breaks** | CSS `break-inside: avoid` — honoured on **both** platforms; the CSS already in `global.css` is the right mechanism and survives the port |
| **A4 size** | `width: 595, height: 842` (A4 @ 72 PPI) — honoured on both platforms |
| **Margins** | `@page { margin: 14mm }` for Android + the `margins` option for iOS. **Neither works on both**; you must set both, to matching values |
| **Delivery** | `expo-sharing.shareAsync` — one share sheet, both platforms. `Print.printAsync` optionally, for a direct print/AirPrint path |
| **A4 vs Mobile split** | **Dies.** One A4 template serves both. The split that survives is Single vs Multiple |

---

## 1. What the four files actually are

Read in full. 606 LOC total.

| File | LOC | Design | Content shape |
|---|---|---|---|
| `ServiceReportA4_Single.tsx` | 120 | Table (4 columns: Task / Details & Notes / Components / Cost) | One Service |
| `ServiceReportA4_Multiple.tsx` | 120 | **Identical file** to A4_Single | — |
| `ServiceReportMobile_Single.tsx` | 148 | Card list, `lucide-react` icons, Action Tags as chips | One Service |
| `ServiceReportMobile_Mutliple.tsx` | 218 | Year-headed timeline, date gutter, one row per Service | A Period of Services |

So there are **three** distinct designs, not four, and the fourth file is dead weight.

**Every value in all four is hardcoded mock data.** "Crux Gravel", "$85.00", "October 12,
2023", "174852", "FAKTURA.PDF (1.2MB)". No props, no API call, no domain types.

**Vocabulary drift from `CONTEXT.md`.** The drafts label the table column "Task" and the
section "Service Events". `CONTEXT.md` explicitly avoids both: an item of work within a
Service is an **Action** (_Avoid_: Task, job, event), and "event" is called out as meaning
the opposite of what it means in the schema. `ServiceReportMobile_Mutliple` groups by year;
the history the app actually reads in is grouped by **Month Group**, and the span it is
read for is a **Period**. The port should fix these labels rather than carry them over.

**Provenance.** All four landed in one commit, `b9be197` (2026-07-21), a large mixed commit
("feat: add service report components for single and multiple services"). Nothing has
referenced them since.

### The one real asset: the print stylesheet

`_frontend/bikecheck/src/global.css:142-174` is genuine, working print CSS:

```css
@page { margin: 14mm; }

@media print {
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0 !important; padding: 0 !important; }
  #root { width: 100% !important; border: 0 !important; }
  [data-purpose="document-preview"] {
    overflow: visible !important; box-shadow: none !important;
    max-width: 100% !important; width: 100% !important;
  }
  [data-purpose="document-preview"] > div { padding: 0 !important; }
  /* Keep an event/card from being split across a page break */
  .break-inside-avoid { break-inside: avoid; }
}
```

This is the part worth porting, and it ports almost verbatim (section 4). Today it works
only via the browser's own Ctrl+P against a page that does not exist.

---

## 2. Recommended: `expo-print` + `expo-sharing`

**`expo-print`** — npm `expo-print@57.0.1` (`registry.npmjs.org/expo-print`, `latest` tag,
published 2026-07-15). Peer deps `expo: *`, `react-native: *`. Docs list platform support
as `['android', 'ios', 'web', 'expo-go']` — so it runs in Expo Go, no dev build needed to
iterate on the template.

**`expo-sharing`** — npm `expo-sharing@57.0.16`, published 2026-08-26. Same platform list.

```ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// A4 at 72 PPI = 595.28 x 841.89 pt.
const A4 = { width: 595, height: 842 } as const;
const MARGIN_PT = 40; // ~14mm, matching @page in global.css

export async function shareServiceReportAsync(html: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({
    html,
    ...A4,
    margins: { top: MARGIN_PT, right: MARGIN_PT, bottom: MARGIN_PT, left: MARGIN_PT }, // iOS only
  });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
}
```

Verified API shapes from `packages/expo-print/src/Print.types.ts` on `main`:

```ts
type FilePrintOptions = {
  html?: string;
  useMarkupFormatter?: boolean;  // @platform ios
  width?: number;                // default 612 (US Letter @ 72 PPI)
  height?: number;               // default 792
  margins?: PageMargins;         // @platform ios
  base64?: boolean;
  textZoom?: number;             // @platform android
};

type FilePrintResult = { uri: string; numberOfPages: number; base64?: string };
```

### Rejected alternatives

| Option | Verdict |
|---|---|
| **`@react-pdf/renderer`** (v4.9.0) | **No React Native target.** Its `package.json` has `main`, `browser`, and no `react-native` field; it depends on `pdfkit`. react-pdf.org states its targets as "a file, a stream or a blob — in Node or straight in the client". Getting it into Metro means polyfilling Node `fs`/`stream`/`zlib` — a new abstraction layer, which `CLAUDE.md` forbids |
| **`react-native-html-to-pdf`** (v1.3.0, published 2025-09-04) | Same HTML-string model as `expo-print`, but third-party, needs a config plugin / prebuild (no Expo Go), 8 open issues, and no first-party iOS maintenance guarantee. `expo-print` does the same job with a shorter chain |
| **`react-native-view-shot` → image → PDF** | Rasterises. Loses selectable text, kills `break-inside: avoid`, and the report is a document a shop or a buyer reads — it must be text |
| **Server-side render in `_backend`** | Out of scope: #23 says the backend is touched only by the additive auth change. Worth revisiting once the deferred `reports` model in `FUTURE_FEATURES.md` ("Public Shareable BikeCheck Report") is built — that feature already needs a server-rendered snapshot, and would let web + RN + public link share one renderer |

---

## 3. HTML string, not components

`printToFileAsync({ html })` takes a string. There is no component tree.

**What this costs.** The 606 LOC of Tailwind-class JSX does not survive. The HTML string is
a standalone document loaded into a bare WebView — Tailwind's stylesheet is not there, the
Mantine theme variables are not there, and `--color-brand` / `--color-text-main` resolve to
nothing. The template must be plain HTML with a hand-written `<style>` block.

Verified from the native sources on `expo/expo@main`:

- **Android** (`PrintPDFRenderTask.kt`): `WebView.loadDataWithBaseURL(null, html, ...)`,
  then `view.createPrintDocumentAdapter("Document")`. A Chromium WebView, no base URL.
- **iOS** (`ExpoWKPDFRenderer.swift`): `WKWebView.loadHTMLString(htmlString, baseURL: Bundle.main.resourceURL)`,
  then `UIPrintPageRenderer` + `webView.viewPrintFormatter()`.

**Consequences for this specific report:**

1. **The logo must be a base64 data URI.** The drafts do `import logoDark from "../assets/icons/bikecheck/Logo_dark.svg"`. Expo's own docs: *"On iOS, printing from HTML source doesn't support local asset URLs (due to `WKWebView` limitations). Instead, images need to be converted to base64 and inlined into the HTML."* Same treatment for attachment thumbnails.
2. **Fonts.** The web app pulls Inter, JetBrains Mono and Space Grotesk from `fonts.googleapis.com` (`index.html:17`). In the print WebView that is a network fetch racing the render — Android fires `onPageFinished` and prints immediately after. Embed the two used faces as base64 `@font-face`, or accept the platform's system font (which will differ between Android and iOS).
3. **`font-display` is already inert.** The drafts use `font-display` heavily, but `global.css` defines only `--font-sans` (Inter) and `--font-mono` (JetBrains Mono) — there is no `--font-display` token, so Tailwind v4 emits nothing for it. What those mockups actually render is Inter. This matches the standing card-typography rule (Inter for names, `font-mono` only for metadata). The port should stop pretending there is a display face.
4. **`<text>` is not an HTML element.** `ServiceReportA4_Single.tsx:107` and `ServiceReportMobile_Single.tsx:115` use `<text className=...>`. React tolerates it; it is an SVG tag in HTML content. Use `<p>` in the template.
5. **Keep the templating in one small module.** A `serviceReportHtml(service: Service): string` function, and a `serviceHistoryReportHtml(services: Service[], period: Period): string` function, both returning strings. No renderer abstraction, no template engine — `CLAUDE.md` rule.

---

## 4. Pagination — how it actually works

This is the part the ticket most needs, so: verified from the native source, not from
StackOverflow.

### Android

`PrintPDFRenderTask.kt` builds `PrintAttributes` from the options and hands the HTML to
Chromium's own print pipeline:

```kotlin
val builder = PrintAttributes.Builder()
var width = DEFAULT_MEDIA_WIDTH   // 612
var height = DEFAULT_MEDIA_HEIGHT // 792
options.width?.let  { width  = it }
options.height?.let { height = it }
var mediaSize = PrintAttributes.MediaSize("id", "label",
  (width / PIXELS_PER_MIL).roundToInt(), (height / PIXELS_PER_MIL).roundToInt())
builder.setMediaSize(mediaSize)
       .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
       .setResolution(PrintAttributes.Resolution("id", "label", 72, 72))
```

- `width`/`height` become the real media size. A4 = `595 x 842`.
- **`margins` is not read on Android at all** — `PrintOptions.kt` (Android) has no `margins`
  field, and the adapter is explicitly given `NO_MARGINS`. Page margins on Android come
  from CSS `@page { margin: ... }` only.
- Pagination itself is Chromium's paged-media layout, so `break-inside: avoid`,
  `break-before`, `break-after` and `@page` all behave as they do in Chrome's print preview.

### iOS

`ExpoPrintToFile.swift` → `ExpoWKPDFRenderer` → `ExpoWKViewPrintPDFRenderer`:

```swift
let renderer = UIPrintPageRenderer()
renderer.addPrintFormatter(webView.viewPrintFormatter(), startingAtPageAt: 0)
// Setting paperRect has no effect on actual page size, but HTML will not render
// without both paperRect and printableRect.
renderer.setValue(paperRect, forKey: "paperRect")
renderer.setValue(self.printableRect, forKey: "printableRect")
```

`printableRect` = page size minus the `margins` option (`PrintOptions.swift:toPrintableRect`).

This renderer was introduced deliberately to fix pagination. Expo PR
[#14802](https://github.com/expo/expo/pull/14802) (merged 2021-10-22), by an Expo
maintainer, says in as many words:

> The PDF snapshot renderer on iOS does not support page-breaks correctly … this causes
> elements to be cut in half and `break-inside: avoid;` to not be respected. This PR
> replaces the snapshot renderer with a `ViewPrint` renderer which leverages the
> `WKWebView.viewPrintFormatter` … This causes elements to be nicely rendered to the next
> page when they don't fit (**and respects `break-inside: avoid;`**). Additionally, it also
> adds support for a `margins` option, as **`@page { margins }` is not supported on iOS
> (only works on Android)**.

`width`/`height` on iOS were separately fixed by PR
[#20046](https://github.com/expo/expo/pull/20046) (merged 2022-11-18) — before that,
custom page sizes were silently ignored on iOS. Anything you read about expo-print
pagination dated before ~2023 (issues #6680, #8843, and the Expo forum thread) predates
both fixes and is stale.

### So the answer for the Multiple report

**The existing CSS is the mechanism, and it ports.** `.break-inside-avoid` on each Service
row is exactly right, and `ServiceReportMobile_Mutliple.tsx` already puts it on all eight
rows. In the template:

```css
@page { margin: 14mm; }                     /* Android only */
.service-row     { break-inside: avoid; }   /* both platforms */
.year-heading    { break-after: avoid; }    /* don't strand a heading */
thead            { display: table-header-group; }  /* repeat the table head per page */
.report-footer   { break-before: avoid; }
```

plus `margins: { top: 40, right: 40, bottom: 40, left: 40 }` in the options so iOS gets the
same 14mm. Set **both**; each platform ignores the other's.

### Two Android caveats worth knowing before you trust the output

1. **`numberOfPages` on Android is an estimate.** `PrintPDFRenderTask.kt` computes
   `numberOfPages = 1 + (view.contentHeight / pageHeight).toInt()` from the WebView's
   scroll height, *before* pagination pushes content across breaks. iOS returns
   `renderer.numberOfPages`, which is the real count. Do not surface `numberOfPages` as
   "N pages" in the UI without checking it on a long report on Android.
2. **Fixed/sticky positioning and `overflow: hidden` fight pagination.** The drafts carry
   `overflow-hidden` on `<main>` and `overflow-x-auto` on the table wrapper — the web print
   CSS already has to undo the first with `overflow: visible !important`. In the RN
   template, just never set them.

---

## 5. How the user receives the file

Three paths; the recommendation is the first, with the third as a cheap extra.

**A. Share sheet — `expo-sharing`.** `shareAsync(uri, { mimeType, UTI })` opens
`ACTION_SEND` (Android) / `UIActivityViewController` (iOS). One call, both platforms, and it
subsumes "save to files": iOS's share sheet has *Save to Files*, Android's has *Save to
Drive* / the file manager. This is what Expo's own `expo-print` docs example does.

Two gotchas from `expo-sharing/src/Sharing.types.ts`:

- The Expo docs example passes `UTI: '.pdf'`, which is **not a UTI**. The types say iOS
  ignores an unresolvable UTI and falls back to `mimeType`. Pass `UTI: 'com.adobe.pdf'`.
- *"The original extension is not removed; the preferred extension is appended."* So a
  mismatched `UTI`/`mimeType` can produce `report.pdf.jpeg`. Keep both consistent with PDF.

**B. Rename before sharing.** `expo-print` writes to a cache path with a **UUID filename** —
iOS: `cachesDirectory + "/Print/" + UUID().uuidString + ".pdf"` (`ExpoPrintToFile.swift`).
The user sees that UUID in the share sheet and in their Files app. Copy or move the file to
a human name first (`bikecheck-crux-gravel-2026-08.pdf`) using `expo-file-system`'s `File`
API before sharing. Small step, large difference in how the feature feels.

**C. Direct print — `Print.printAsync({ html, ...A4 })`.** Verified in `PrintModule.kt`:
Android renders the HTML then hands the adapter to the system `PrintManager`, which opens
Android's print dialog — and that dialog's *Save as PDF* destination is a second save
route for free. On iOS it opens the AirPrint sheet (`selectPrinterAsync` is iOS-only).
Note the promise semantics differ: iOS resolves when printing starts, Android resolves
when the dialog is shown.

**Not recommended: Android `StorageAccessFramework`.** A "save to a folder you pick" flow
exists (`StorageAccessFramework.requestDirectoryPermissionsAsync` + `createFileAsync`) but
it lives **only in the legacy API** (`import * as FileSystem from 'expo-file-system/legacy'`)
and is **Android-only** — the SDK 57 `File`/`Directory`/`Paths` API has no equivalent. Using
it would mean a platform-forked delivery path on top of a deprecated import, to duplicate
what the share sheet already gives you on both platforms.

---

## 6. Does the A4 / Mobile split survive?

**No. One implementation serves both.**

The split only ever made sense because the web component was doing two jobs at once: it was
both the on-screen page and the thing the browser printed. `sm:` breakpoints made it read
on a phone; `@media print` made it read on paper. The DOM was shared, so the responsive
variant had to be print-aware.

In RN those two jobs come apart completely:

- The **on-screen** job, if there is one, is a native RN screen — RN components, the app's
  design system, no HTML.
- The **PDF** job is an HTML string rendered off-screen at exactly `595 x 842`. It is never
  displayed at any other width, so it has no responsive dimension. There is nothing for a
  "Mobile" variant to be responsive *to*.

So: **one A4 HTML template.** No breakpoints, no `sm:` classes.

**What survives is Single vs Multiple**, and that split is real — it is a domain
distinction, not a viewport one:

| | Renders | Header carries |
|---|---|---|
| **Single** | One **Service** — its Actions, each Action's **Action Note**, the **Mounted Components** touched, cost, attachments | Bike, **Service Date**, odometer, total |
| **Multiple** | The Services in a **Period**, grouped by **Month Group** | Bike, the Period's bounds, **History Totals** (spend, Service count, Replacement count) |

The `ServiceReportMobile_*` designs are the better starting point for both — they are newer,
they already carry `break-inside-avoid`, and the card/timeline layout survives a page break
far better than the A4 table does. `ServiceReportA4_Multiple.tsx` is a duplicate file and
should simply be deleted rather than ported.

One consequence worth flagging to #23: an **RN-only** report is a parity *regression* if the
web app ever wires its drafts up. If both clients are to have it, the shared surface is the
HTML template string, which is plain TypeScript and could live in a place both consume —
or, better, waits for the server-rendered `reports` snapshot in `FUTURE_FEATURES.md`.

---

## 7. iOS confirmation (standing constraint from #23)

| Requirement | Android | iOS | Source |
|---|---|---|---|
| Library exists and is first-party | yes | yes | `expo-print` docs `platforms: ['android','ios','web','expo-go']` |
| HTML → PDF file | `WebView` + `createPrintDocumentAdapter` | `WKWebView` + `viewPrintFormatter` | `PrintPDFRenderTask.kt`, `ExpoWKPDFRenderer.swift` |
| A4 page size honoured | yes, `PrintAttributes.MediaSize` | yes, since PR #20046 (2022-11) | native source + PR |
| `break-inside: avoid` honoured | yes (Chromium paged media) | yes, since PR #14802 (2021-10) | PR #14802 text |
| Page margins | `@page { margin }` **only** | `margins` option **only** | Android `PrintOptions.kt` has no margins field; PR #14802 |
| Accurate page count | **estimated** | exact | `PrintPDFRenderTask.kt` vs `ExpoWKPDFRenderer.swift` |
| Local image assets in HTML | works | **must be base64** | expo-print docs, "Local images" |
| Share sheet | `ACTION_SEND` | `UIActivityViewController` | `expo-sharing` docs |
| Direct print | system `PrintManager` dialog | AirPrint | `PrintModule.kt`, docs |
| Minimum OS | — | iOS 16.4 (SDK 56 bump) | `expo-print/CHANGELOG.md`, 56.0.0 |

**No Android-only dependency in this recommendation.** The one place where the two platforms
genuinely diverge is margins, and it is handled by setting both mechanisms.

**One live iOS report to be aware of, and it is not expo-print's fault.** Issue
[#49091](https://github.com/expo/expo/issues/49091) (open, 2026-08-19) reports an iOS launch
crash "after adding expo-print" on SDK 57 — `dyld Symbol not found in ExpoModulesCore`.
Expo's own automated triage reproduced it and found the cause is a `pnpm.overrides` block
pinning `expo-modules-core` to 57.0.3 while prebuilt module binaries reference
`BaseModule.willDestroy()`, added in 57.0.9. Their conclusion: *"`expo-print` is not needed:
remove it and `expo-file-system@57.0.4` still installs."* Fix is to drop the override and
reinstall. Not a blocker — but if `_mobile/` ever pins Expo package versions by hand, this
is the failure mode.

---

## 8. What I could not verify

- **Nothing was executed.** No `_mobile/` project exists in the repo yet, and this session
  has no Android or iOS device. Every platform claim above comes from reading Expo's native
  source on `expo/expo@main` and from merged Expo PRs — not from a rendered PDF. The first
  implementation ticket should render a two-page Multiple report on a real Android device
  and check that a Service row is never split.
- **Chromium's `@page { margin }` support in the Android system WebView** is asserted by
  Expo PR #14802 ("only works on Android") and is consistent with `NO_MARGINS` being set at
  the `PrintAttributes` level, but I did not find an Android-platform document stating it.
- **Whether `break-inside: avoid` survives a row taller than one page.** By spec the
  browser must break anyway; the failure mode is a row clipped rather than flowed. Not
  reachable for a Service row in practice, but a long Action Note could get close.
- **Whether the web app is meant to get this feature too.** The drafts suggest yes, and
  nothing in #23 says. Flagged in section 6.
- **The iOS `useMarkupFormatter: true` path** (`UIMarkupTextPrintFormatter`) was not
  investigated in depth because Expo's own types say it *"doesn't display images"*, which
  rules it out for a report carrying a logo.

---

## Sources

Primary — Expo native source, read on `github.com/expo/expo@main`:

- `packages/expo-print/android/src/main/java/expo/modules/print/PrintPDFRenderTask.kt`
- `packages/expo-print/android/src/main/java/expo/modules/print/PrintOptions.kt`
- `packages/expo-print/android/src/main/java/expo/modules/print/PrintModule.kt`
- `packages/expo-print/ios/ExpoPrintToFile.swift`
- `packages/expo-print/ios/ExpoWKPDFRenderer.swift`
- `packages/expo-print/ios/ExpoWKViewPrintPDFRenderer.swift`
- `packages/expo-print/ios/PrintOptions.swift`
- `packages/expo-print/src/Print.types.ts`
- `packages/expo-print/CHANGELOG.md`
- `packages/expo-sharing/src/Sharing.types.ts`, `packages/expo-sharing/src/Sharing.ts`
- `packages/expo-file-system/src/legacy/FileSystem.ts` (`StorageAccessFramework` namespace)

Primary — Expo docs and PRs:

- https://docs.expo.dev/versions/latest/sdk/print/ and its source
  `docs/pages/versions/unversioned/sdk/print.mdx`
- https://docs.expo.dev/versions/latest/sdk/sharing/
- https://docs.expo.dev/versions/latest/sdk/filesystem/
- https://github.com/expo/expo/pull/14802 — iOS `viewPrintFormatter` renderer, merged 2021-10-22
- https://github.com/expo/expo/pull/20046 — iOS width/height fix, merged 2022-11-18
- https://github.com/expo/expo/issues/49091 — SDK 57 iOS dyld crash, open, with Expo's triage

Versions confirmed against `registry.npmjs.org` on 2026-08-28:
`expo@57.0.18`, `expo-print@57.0.1`, `expo-sharing@57.0.16`,
`@react-pdf/renderer@4.9.0` (no `react-native` entry point),
`react-native-html-to-pdf@1.3.0` (published 2025-09-04).

Repo sources: the four `_frontend/bikecheck/src/components/ServiceReport*.tsx` files,
`_frontend/bikecheck/src/global.css:142-174`, `_frontend/bikecheck/index.html:17`,
`_frontend/bikecheck/src/App.tsx` (route table), `CONTEXT.md`, `FUTURE_FEATURES.md`,
commit `b9be197`.
