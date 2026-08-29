# Attachments in a Report are served through it, never straight from storage

A Report lists the attachments of the Services it covers, and each one is fetched through
`/r/:token/attachment/:id` rather than through the storage URL the app itself uses.

Uploads land on Cloudflare R2 under a permanent public URL — unguessable, but unrevokable. Put one
in a Report and revoking the Share Link would leave the invoice behind it open forever, to anyone
who saved the address or was forwarded it. The owner would be told the doc was taken back when it
was not. Serving the file through the Report costs a proxying route and gives revocation its
meaning: the doc and its files die together.

## Consequences

- The route re-checks the Report on every file request, so revoking closes the attachments at the
  same instant as the page.
- Attachments are still ordinary public URLs everywhere else in the app. This decision is about
  what a Report hands to a stranger, not about how storage works.
