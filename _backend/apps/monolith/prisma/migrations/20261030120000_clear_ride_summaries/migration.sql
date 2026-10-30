-- Reviews are now written in the rider's language on the first open (ADR 0044); the old ones are
-- English and name Strava's gear rather than the bike, so the next open writes them again.
UPDATE "rides" SET "summary" = NULL WHERE "summary" IS NOT NULL;
