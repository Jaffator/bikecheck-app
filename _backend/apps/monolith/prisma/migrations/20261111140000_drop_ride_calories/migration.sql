-- Strava's kcal estimate is Strava Data we may not keep (policy §6.2); the Energy figure is gone with it (#383).
ALTER TABLE "rides" DROP COLUMN "calories";
