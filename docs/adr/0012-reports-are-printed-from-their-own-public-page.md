# A Report is printed from its own public page

The Report layouts are React components in this app — one per kind, each with a `screen` and a
`print` variant. The public page at `/r/:token` renders them from the snapshot, and a PDF is made
by opening that same page in headless chromium on the server and printing it to A4. The backend
never builds HTML of its own.

The obvious alternative was a server-side HTML template. It needs no public web page and no
browser, but it means the doc is designed twice — once as a React component for the app's preview,
once as a template for print — and the two drift apart on the first change nobody remembers to
make in both places. Chromium is already a production dependency here (the bike data scraper), so
printing the real page costs a route rather than an architecture.

## Consequences

- **The public web build is a hard dependency.** Sharing and PDF both stop working until this app
  is deployed as a website at `PUBLIC_APP_URL`, with `/r/:token` outside the authenticated shell.
  Until then the whole feature works against `localhost` and only for the developer.
- **PDF is offered on the public page, not in the app.** The owner reaches it the same way the
  recipient does. This drops the file plugins the app would otherwise need, and it means a Report
  must be published before its PDF exists — the owner who wants only a file publishes, downloads
  and revokes.
- The preview in the export sheet, the public page and the PDF are one component fed from three
  places, so what the owner reviewed is what the recipient reads.
- Link previews in messengers stay blank. The page is empty HTML until its script runs, and the
  crawlers that build those cards do not run scripts. Fixing it means serving meta tags server-side
  for `/r/:token`, which is not worth doing before the page is deployed at all.
