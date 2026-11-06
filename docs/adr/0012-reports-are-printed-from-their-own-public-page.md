# A Report is printed from its own public page, whether or not that page is open

The Report layouts are React components in this app — one per kind, each with a `screen` and a
`print` variant. The public page at `/r/:token` renders them from the snapshot, and a PDF is made
by opening that same page in headless chromium on the server and printing it to A4. The backend
never builds HTML of its own.

The obvious alternative was a server-side HTML template. It needs no public web page and no
browser, but it means the doc is designed twice — once as a React component for the app's preview,
once as a template for print — and the two drift apart on the first change nobody remembers to
make in both places. Chromium is already a production dependency here (the bike data scraper), so
printing the real page costs a route rather than an architecture.

This ADR used to say a Report must be published before its PDF exists, so an owner who wanted only
a file had to publish, download and revoke: a public link opened just to get a file. That no longer
holds. The owner downloads the PDF from the preview in the export window, and the Share Link stays
closed. Chromium still has to read the document through the page, so the server mints a key for
that one print and presents it itself.

The key is 32 random bytes, tied to one Report, valid for 60 seconds and retired the moment the
print ends. It travels only in the `x-report-print-key` header, added by chromium's request routing
to the one API read of that Report. It is never in an address, so it reaches no referrer and no
script on the page, and the web app does not know it exists. Access logs do record headers, so
both on its way drop this one: the Caddyfile's log filter and the monolith's redact list. It is
never returned to the owner, whose browser receives only the file.

A signed key would need no memory, but it could not be retired and would either need a new secret
or share the session's. A key stored on the Report would need a migration for something that lives
under a minute. So keys sit in the memory of the process that printed them. That relies on one
monolith answering both the owner and chromium, which is how production runs.

The phone cannot save a blob from a webview, and its system browser has no session, so it needs an
address of its own. The app asks for a ticket with its session; the server prints the Report there
and then, holds the file in memory and answers 32 random bytes, which the app puts in
`/reports/pdf-ticket/:ticket` and opens in the system browser. Printing first means a failure
reaches the app, where the export window can say so, and the address does nothing but hand over
bytes: it opens no Report, launches no browser and answers for no Share Link.

That secret does sit in an address, so it is good for one read and 60 seconds, and it is dead by the
time an access log line is written. Both logs blank it anyway. A reload in the browser is refused, so
the owner taps Stáhnout PDF again. It lives in memory for the reason the print key does, and a
stored file would outlive the window that made it.

## Consequences

- **The public web build is a hard dependency.** Sharing and PDF both stop working until this app
  is deployed as a website at `PUBLIC_APP_URL`, with `/r/:token` outside the authenticated shell.
- **The closed link stays closed.** A missing, wrong or expired key answers exactly as a closed
  link does. The key opens only the document read, so the public PDF and attachment routes never
  answer for a closed Report.
- **Closing the export window discards an unpublished Report**, so a file downloaded without
  publishing leaves nothing in Moje reporty.
- A reader of a published Report still downloads the PDF from the public page.
- A second monolith instance would have to share the keys and held files, in Redis for instance,
  or a read could land on an instance that never minted them.
- No file plugins: the phone's browser keeps or sends the file. A held file may outlive its Report
  by up to a minute, as a file already downloaded would.
- The preview in the export sheet, the public page and the PDF are one component fed from three
  places, so what the owner reviewed is what the recipient reads.
- The page is empty HTML until its script runs, and the crawlers that build link previews do not
  run scripts, so the tags for `/r/:token` are served server-side by `preview.service`.
