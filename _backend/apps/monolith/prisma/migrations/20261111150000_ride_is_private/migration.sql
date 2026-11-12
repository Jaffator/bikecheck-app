-- A ride Strava shows only to its athlete is marked as private in the app (#379).
-- IF NOT EXISTS: strava_retention adds it already where it still had json_data to fill it from.
ALTER TABLE "rides" ADD COLUMN IF NOT EXISTS "is_private" BOOLEAN NOT NULL DEFAULT false;
