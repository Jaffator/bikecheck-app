-- For a database that ran strava_retention before it kept the route; elsewhere it exists already.
ALTER TABLE "rides" ADD COLUMN IF NOT EXISTS "summary_polyline" TEXT;
