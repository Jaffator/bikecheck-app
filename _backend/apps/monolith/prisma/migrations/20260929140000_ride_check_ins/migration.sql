-- Ride check-in (PRD #200): how the bike rode, one row per ride, cascading with it.
-- The user's check_in_prompted_at is when the phone last opened the check-in drawer.
--
-- Idempotent: re-running changes nothing.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'check_in_status') THEN
    CREATE TYPE "check_in_status" AS ENUM ('OK', 'ISSUE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'check_in_symptom') THEN
    CREATE TYPE "check_in_symptom" AS ENUM (
      'CREAK', 'SHIFTING_SKIPS', 'SOFT_BRAKE', 'FORK_SETUP', 'SHOCK_SETUP', 'TIRE_LOSES_AIR', 'HEADSET_PLAY', 'OTHER'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ride_check_ins" (
  "ride_id"    INTEGER NOT NULL,
  "status"     "check_in_status" NOT NULL,
  "symptoms"   "check_in_symptom"[] NOT NULL DEFAULT ARRAY[]::"check_in_symptom"[],
  "note"       VARCHAR(500),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ride_check_ins_pkey" PRIMARY KEY ("ride_id"),
  CONSTRAINT "ride_check_ins_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "check_in_prompted_at" TIMESTAMPTZ(6);
