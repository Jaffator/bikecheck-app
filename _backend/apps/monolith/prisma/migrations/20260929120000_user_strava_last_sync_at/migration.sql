-- Last manual Strava sync (#196); null until the user syncs once.
-- Additive and idempotent: re-running changes nothing.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "strava_last_sync_at" TIMESTAMPTZ(6);
