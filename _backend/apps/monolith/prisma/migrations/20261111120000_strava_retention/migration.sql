-- Strava Data is cached 7 days at most (policy §6.2): rides keep only their own figures,
-- a pending row's payload is purged and fetched again when needed (#375).
ALTER TABLE "rides" DROP COLUMN "json_data";
ALTER TABLE "rides" DROP COLUMN "summary";

ALTER TABLE "strava_pending_activities" DROP COLUMN "summary";
ALTER TABLE "strava_pending_activities" ALTER COLUMN "analyzed_data" DROP NOT NULL;
ALTER TABLE "strava_pending_activities" ADD COLUMN "analyzed_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP;
UPDATE "strava_pending_activities" SET "analyzed_at" = "created_at";
