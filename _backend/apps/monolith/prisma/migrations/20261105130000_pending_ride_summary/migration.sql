-- An Unassigned Ride now shows its AI review before it has a bike (ADR 0046).
ALTER TABLE "strava_pending_activities" ADD COLUMN "summary" VARCHAR;
