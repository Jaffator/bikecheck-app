-- Anonymous account events (ADR 0028, revised): the count of riders over time, kept after
-- the riders themselves are gone. No user id, no email - one row per verification, one
-- per deletion, and how long the deleted account lived.
--
-- Every account already verified is backfilled as one 'verified' event at the moment it
-- was verified, so the curve starts where the app did rather than at zero today.
CREATE TABLE IF NOT EXISTS "account_events" (
  "id"               SERIAL PRIMARY KEY,
  "kind"             VARCHAR(16) NOT NULL,
  "occurred_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "account_age_days" INTEGER
);

CREATE INDEX IF NOT EXISTS "account_events_occurred_at_idx" ON "account_events" ("occurred_at");

INSERT INTO "account_events" ("kind", "occurred_at")
SELECT 'verified', "email_verified_at"
FROM "users"
WHERE "email_verified_at" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "account_events");
