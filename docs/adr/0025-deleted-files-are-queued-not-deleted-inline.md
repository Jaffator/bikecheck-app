# Deleted files are queued, not deleted inline

*Status: accepted, not yet built.*

Deleting a bike (ADR 0024) orphans everything it had in R2 — its photo and every attachment on
every one of its Services. `StorageService` can upload and download and has no delete at all, so
today those objects simply stay.

Deleting them inline was rejected: a bike with twenty services means twenty-odd calls to cloud
storage inside what must be one atomic act, each able to fail on its own with no way to retry. A
half-deleted bike is a worse outcome than an orphaned file.

So the deletion writes the storage keys into a `pending_file_deletions` row set
(`storage_key`, `created_at`, `attempts`, `last_error`) in the same transaction as the `DELETE`.
The transaction stays pure database and keeps its atomicity; the network work happens afterwards.

A `@nestjs/schedule` cron inside the monolith drains it — a batch at a time, deleting the row on
success and incrementing `attempts` with `last_error` on failure. After five attempts the row is
left where it is rather than dropped, so a persistent failure stays visible instead of vanishing.
Running the job in more than one instance is harmless here: the second delete of an object that is
already gone is a no-op. That tolerance is a property of file deletion, not of the scheduler, and
does not extend to whatever job is added next.

The alternatives were a drain triggered lazily by the next request that queues something — which
never runs again once the app goes quiet, so a failed deletion can wait forever — and a cron
outside the application, which moves a data-integrity guarantee into the deployment and stops it
running locally at all.

## Consequences

- The application gains a scheduler. This was previously the reason for rejecting a self-emptying
  30-day bin for bikes (ADR 0024); that objection no longer holds, though the decision stands.
- Until this is built, deleting a bike leaves its files in R2. Recorded debt, not a defect: the
  objects are unreachable without their URL and cost nothing worth acting on.
