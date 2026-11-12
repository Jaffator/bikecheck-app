-- Strava Data is cached 7 days at most (policy §6.2): rides keep only their own figures,
-- a pending row's payload is purged and fetched again when needed (#375).

-- The route (thumbnail) and the private flag (#379) are lifted out before the raw payload goes.
-- json_data holds Strava's activity as a JSON string inside jsonb, so it is decoded once more before read.
ALTER TABLE "rides" ADD COLUMN "summary_polyline" TEXT;
ALTER TABLE "rides" ADD COLUMN "is_private" BOOLEAN NOT NULL DEFAULT false;
UPDATE "rides"
SET "summary_polyline" = NULLIF((json_data #>> '{}')::jsonb -> 'map' ->> 'summary_polyline', ''),
    "is_private" = COALESCE(
      (json_data #>> '{}')::jsonb ->> 'visibility' = 'only_me' OR (json_data #>> '{}')::jsonb ->> 'private' = 'true',
      false
    )
WHERE json_data IS NOT NULL
  AND jsonb_typeof(json_data) IN ('string', 'object');

ALTER TABLE "rides" DROP COLUMN "json_data";
ALTER TABLE "rides" DROP COLUMN "summary";

ALTER TABLE "strava_pending_activities" DROP COLUMN "summary";
ALTER TABLE "strava_pending_activities" ALTER COLUMN "analyzed_data" DROP NOT NULL;
ALTER TABLE "strava_pending_activities" ADD COLUMN "analyzed_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP;
UPDATE "strava_pending_activities" SET "analyzed_at" = "created_at";
