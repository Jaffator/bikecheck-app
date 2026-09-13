-- Setup Profiles: the numbers a bike is ridden at, held on the bike in named profiles that
-- are rewritten in place (ADR 0029). One row per profile per bike - Trail, Race, Park - each
-- holding every number at once: both tyre pressures and, for the fork and the shock, the
-- pressure, tokens, sag and the four click counts. Saving a profile overwrites the row; there
-- is no history table behind it.
--
-- The old `suspension_setup` and `tire_setup` hung off `components_mounted`, so a setup died
-- with the part on every Replacement (ADR 0003). No screen ever wrote them and only the chat's
-- `get_setup` read them, so they go in the same migration and nothing is carried over.
--
-- Every number is nullable: null is "not recorded", a zero is a real zero. Pressures are psi
-- to one decimal (a bar value converted to psi is not an integer); tokens, sag and clicks are
-- integers, clicks counted from fully closed. Tyres are read in the owner's account-wide
-- Tyre Pressure Unit, added to `users` here; suspension is always read in psi.
--
-- Idempotent: re-running changes nothing.

-- ---------------------------------------------------------------------------
-- 1. The Tyre Pressure Unit, chosen once per account
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tire_pressure_unit') THEN
    CREATE TYPE "tire_pressure_unit" AS ENUM ('bar', 'psi');
  END IF;
END $$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "tire_pressure_unit" "tire_pressure_unit" NOT NULL DEFAULT 'bar';

-- ---------------------------------------------------------------------------
-- 2. One profile per row, cascading from the bike
-- ---------------------------------------------------------------------------
-- A profile falls with its bike, so Deleting a Bike takes its setups with it.
CREATE TABLE IF NOT EXISTS "setup_profiles" (
  "id"                   SERIAL         PRIMARY KEY,
  "bike_id"              INTEGER        NOT NULL,
  "name"                 VARCHAR(50)    NOT NULL,
  "note"                 VARCHAR(500),
  "front_tire_psi"       DECIMAL(5,1),
  "rear_tire_psi"        DECIMAL(5,1),
  "fork_pressure_psi"    DECIMAL(5,1),
  "fork_tokens"          INTEGER,
  "fork_sag_percent"     INTEGER,
  "fork_rebound_ls"      INTEGER,
  "fork_rebound_hs"      INTEGER,
  "fork_compression_ls"  INTEGER,
  "fork_compression_hs"  INTEGER,
  "shock_pressure_psi"   DECIMAL(5,1),
  "shock_tokens"         INTEGER,
  "shock_sag_percent"    INTEGER,
  "shock_rebound_ls"     INTEGER,
  "shock_rebound_hs"     INTEGER,
  "shock_compression_ls" INTEGER,
  "shock_compression_hs" INTEGER,
  "created_at"           TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"           TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'setup_profiles_bike_id_fkey') THEN
    ALTER TABLE "setup_profiles"
      ADD CONSTRAINT "setup_profiles_bike_id_fkey"
      FOREIGN KEY ("bike_id") REFERENCES "bikes"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

-- Two profiles on one bike never share a name, so switching between them is unambiguous.
CREATE UNIQUE INDEX IF NOT EXISTS "setup_profiles_bike_id_name_key" ON "setup_profiles" ("bike_id", "name");

-- ---------------------------------------------------------------------------
-- 3. The part-keyed setup tables go
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS "suspension_setup";
DROP TABLE IF EXISTS "tire_setup";
