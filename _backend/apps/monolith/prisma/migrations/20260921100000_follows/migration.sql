-- Follow (PRD #133): one row per relationship, a rider following an owner's garage. A Public
-- follow is ACCEPTED at birth; a Follow Request on a Followers-only profile waits as PENDING.
-- Decline, withdraw, unfollow and remove all delete the row - there is no REJECTED, so a
-- repeated request is possible. Both sides cascade from users: deleting an account removes
-- every relationship in both directions (ADR 0028).
--
-- Idempotent: re-running changes nothing.

-- ---------------------------------------------------------------------------
-- 1. The two states a relationship stands in
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'follow_status') THEN
    CREATE TYPE "follow_status" AS ENUM ('PENDING', 'ACCEPTED');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. The relationship, one row per pair
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "follows" (
  "follower_id" INTEGER         NOT NULL,
  "followed_id" INTEGER         NOT NULL,
  "status"      "follow_status" NOT NULL,
  "created_at"  TIMESTAMPTZ(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accepted_at" TIMESTAMPTZ(6)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'follows_follower_id_fkey') THEN
    ALTER TABLE "follows"
      ADD CONSTRAINT "follows_follower_id_fkey"
      FOREIGN KEY ("follower_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'follows_followed_id_fkey') THEN
    ALTER TABLE "follows"
      ADD CONSTRAINT "follows_followed_id_fkey"
      FOREIGN KEY ("followed_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
  -- Prisma has no check constraints; the service refuses self-follow before this does.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'follows_not_self') THEN
    ALTER TABLE "follows"
      ADD CONSTRAINT "follows_not_self" CHECK ("follower_id" <> "followed_id");
  END IF;
END $$;

-- One row per pair, whichever way it stands.
CREATE UNIQUE INDEX IF NOT EXISTS "follows_follower_id_followed_id_key" ON "follows" ("follower_id", "followed_id");

-- The owner's lists and counts: who follows me, who asked.
CREATE INDEX IF NOT EXISTS "follows_followed_status" ON "follows" ("followed_id", "status");
