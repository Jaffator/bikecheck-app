-- Public Profile (PRD #131): one live page per account at /u/<handle>, read as the garage
-- stands when opened. One row per account, born on the owner's first confirm in the share
-- drawer. Off keeps the row and the handle; only deleting the account removes it (ADR 0028),
-- which is why the FK cascades. A renamed handle is free at once - there is no history table.
--
-- `bikes.is_shared` is the per-bike switch. Archiving does not touch it; every profile read
-- filters archived bikes out on its own.
--
-- Idempotent: re-running changes nothing.

-- ---------------------------------------------------------------------------
-- 1. Visibility: nobody, approved followers in the app, or anyone at the address
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profile_visibility') THEN
    CREATE TYPE "profile_visibility" AS ENUM ('OFF', 'FOLLOWERS', 'PUBLIC');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. The profile row, 1:1 to the account
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public_profiles" (
  "user_id"          INTEGER              PRIMARY KEY,
  "handle"           VARCHAR(30)          NOT NULL,
  "visibility"       "profile_visibility" NOT NULL DEFAULT 'OFF',
  "share_components" BOOLEAN              NOT NULL DEFAULT true,
  "share_setup"      BOOLEAN              NOT NULL DEFAULT true,
  "share_history"    BOOLEAN              NOT NULL DEFAULT true,
  "share_costs"      BOOLEAN              NOT NULL DEFAULT false,
  "view_count"       INTEGER              NOT NULL DEFAULT 0,
  "last_viewed_at"   TIMESTAMPTZ(6),
  "created_at"       TIMESTAMPTZ(6)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMPTZ(6)       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'public_profiles_user_id_fkey') THEN
    ALTER TABLE "public_profiles"
      ADD CONSTRAINT "public_profiles_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

-- Stored lowercase, so one unique index is the whole case-insensitive rule.
CREATE UNIQUE INDEX IF NOT EXISTS "public_profiles_handle_key" ON "public_profiles" ("handle");

-- ---------------------------------------------------------------------------
-- 3. The per-bike switch: every bike goes out unless the owner says otherwise
-- ---------------------------------------------------------------------------
ALTER TABLE "bikes" ADD COLUMN IF NOT EXISTS "is_shared" BOOLEAN NOT NULL DEFAULT true;
