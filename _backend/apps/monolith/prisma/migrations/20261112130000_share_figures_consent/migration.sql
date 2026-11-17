-- Km and time from Strava reach other readers only with the owner's consent (#380).
ALTER TABLE "public_profiles" ADD COLUMN "share_figures" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "reports" ADD COLUMN "share_figures" BOOLEAN NOT NULL DEFAULT false;
