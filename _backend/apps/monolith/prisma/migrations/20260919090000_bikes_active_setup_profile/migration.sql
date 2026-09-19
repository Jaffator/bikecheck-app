-- Which Setup Profile a bike is ridden at right now: the one its owner last chose on the
-- Setup screen. A follower reading the bike's public page is told this is the current one.
--
-- Set whenever the bike has a profile at all: every bike that already has profiles is
-- backfilled with its oldest, which is what the screen opened on until now. Deleting the
-- active profile hands over to a neighbour in the service; the FK's SET NULL is only the
-- safety net under it.
--
-- Idempotent: the column, its FK and the backfill are added together, once.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bikes' AND column_name = 'active_setup_profile_id'
  ) THEN
    ALTER TABLE "bikes" ADD COLUMN "active_setup_profile_id" INTEGER;
    ALTER TABLE "bikes" ADD CONSTRAINT "bikes_active_setup_profile_id_fkey"
      FOREIGN KEY ("active_setup_profile_id") REFERENCES "setup_profiles"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
    UPDATE "bikes" b SET "active_setup_profile_id" = oldest.id
    FROM (
      SELECT DISTINCT ON (bike_id) id, bike_id
      FROM "setup_profiles"
      ORDER BY bike_id, created_at ASC, id ASC
    ) oldest
    WHERE oldest.bike_id = b.id;
  END IF;
END $$;
