-- Service history is opt-in now; existing profiles keep whatever they had.
ALTER TABLE "public_profiles" ALTER COLUMN "share_history" SET DEFAULT false;
