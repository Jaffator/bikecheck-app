# PRD: Export and sharing

Design: the **Export a sdílení** row on the "BikeCheck app" canvas (https://claude.ai/artifact/J9M6esGbsGrVPeFiiuhtNU, private to the owner). The canvas is the source for look and layout. Copy below is the Czech the app will show.

Decisions come from the map [Jednotné sdílení](https://github.com/Jaffator/bikecheck-app/issues/338), tickets #339 to #343. This file records them because the tickets could not be updated at the time of writing.

## Problem Statement

The app has several ways of handing out a bike, and they do not read as one system:

- A bike exports a BikeCheck, a Service a Service Report, the history a Period Report.
- The same action is "Sdílet" on the phone and "Export" with a download icon on desktop.
- "A link to the bike" means either a frozen Report or the live Public Profile, and the bike detail knows only the first.
- Nothing on a bike says whether it is out there, or in what form.
- A PDF exists only after publishing, so someone who wants a file must open a public link, download, and revoke.
- Switching a profile to Public exposes every bike at once.

## Solution

Two functions, plainly separate:

- **Export** is a frozen document. Everywhere the word "Export" with the download icon.
- **Sdílení** is the live profile. It keeps its own place, the share drawer.

BikeCheck and Period Report merge into one document, **Report kola**. A Service Report stays as it is.

## Decisions

### Export

- The word "Export" with the lucide `Download` icon on every entry: bike detail, Service and history, phone and desktop. The share icon goes from these buttons.
- Sharing a published link stays "Sdílet": that is sending a link, not exporting.
- In Service, Export stays disabled until a bike is selected, as it is on desktop today. Its "Vyber kolo" tooltip stays.
- One window, in `ExportSheet`. From a bike it opens on the whole history, from Service prefilled from the filter.

### The window

**Step 1, what goes in** (Report kola only):

- The photo and the bike's details are always in.
- Switches **Komponenty** and **Servisní historie**, both on by default.
- **Období** under the history, default **Celá historie**.
- **Náhled** leads to step 2.

**Step 2, preview**:

- The document, then two actions: **Stáhnout PDF** (primary) and **Zveřejnit odkaz** (quiet outline). Publishing is meant to stay a deliberate act.
- One line under them says the file is yours and the link opens the Report to anyone.
- A Service Report opens on step 2, as it has nothing to choose.
- On desktop the options sit straight on the modal, with no card inside it.

### PDF without publishing

- A Report can be printed while its Share Link is closed. The link stays closed.
- Closing the window discards an unpublished Report as it does today, so a file downloaded without publishing leaves nothing in Moje reporty.
- The server mints a short-lived secret key for the print and uses it itself, so chromium can open the closed Report and nobody else can.
- On the phone the app gets a short-lived address for the PDF and opens it in the system browser. No file plugins.
- The window stays open after **Stáhnout PDF**, so the owner can still publish.
- ADR 0012 must be rewritten: its "a Report must be published before its PDF exists" no longer holds.

### Report kola and existing Reports

- UI name **Report kola**, glossary **Bike Report**. New Reports are written as a new kind.
- A Report is frozen (ADR 0011), so existing BikeCheck and Period Reports keep their look, and their links keep working.
- In Moje reporty they read "Report kola".
- The `BikeCheck*` and `PeriodReport*` documents and print variants stay in the code for good, to render those snapshots.
- Update the kind's name in link previews (`preview.service.ts`), the AI chat (`reports.tools.ts`), and copy that calls BikeCheck a document.

### Sdílení

- The live page does not appear in the Export window. Entries stay: the **Profil** chip on Home and Settings.
- No merged overview page. Moje reporty and the profile stay apart (#340).

### Choosing bikes before going Public

- Before any switch to Public, from any entry, a window **Která kola ukážeš?** lists the bikes with their Shared Bike switches, preset to their current state.
- **Zveřejnit** saves. **Zrušit** changes nothing, and the profile stays as it was.
- Skipped when the account has one bike.
- The save order flips: bikes first, then visibility. Today it is profile first (`useSaveSharing`), which leaves the bikes out for a moment and stays that way if the bike save fails.

### Marks on the bike photo

On the garage card and the bike detail, phone and desktop:

- **Profile**: globe for Public, people for Followers only. Shown only when the bike is a Shared Bike on a profile that is not Off.
- **Reports**: link icon with the count of published, unrevoked Reports for this bike. Hidden at 0.
- Pills in the style of the Strava badge, stacked above the existing ones.
- Information only: a click on the card opens the detail.
- Moje reporty's data can be fetched once and grouped by `bike_id`, so a garage does not ask per card.

## Already done

On branch `feat/bike-detail-tiles`:

- Home's chip reads **Profil**.
- Desktop bike detail: Přidat servis in the header, tiles Historie servisu, Setup and Moje reporty, plus a Strava tile when Strava has something to ask (2×2), otherwise three in a row.

## Suggested tickets

1. Export word and icon on every entry.
2. Bike Report: new kind, snapshot, export step 1, document and print variant.
3. PDF from the export window for an unpublished Report, ADR 0012.
4. Existing kinds read "Report kola", plus previews, AI chat and copy.
5. Bike picker before going Public, and the save order.
6. Marks on the bike photo.

Tickets 1, 5 and 6 are independent. Ticket 4 follows 2.

## Not yet specified

- Onboarding copy. The Welcome's sharing slide and the `reports` and `sharing` Hints must match this, and onboarding is paused.
- Where the QR code on the frame from `ROADMAP.md` should point.

## Out of scope

- A live page entry in the Export window.
- Any change to the Service Report's content.
- Converting existing Reports to the new layout.
