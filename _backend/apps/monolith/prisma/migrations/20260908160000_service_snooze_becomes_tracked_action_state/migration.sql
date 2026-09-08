-- `service_snooze` becomes the state of a Tracked Action (ADR 0026, ADR 0027).
--
-- The old table was keyed `(bike_id, event_action_id)`, which cannot tell a front tyre
-- from a rear one: postponing one job would have silenced both. A Tracked Action is a
-- part and an action, so the key moves onto the mounted part.
--
-- The table is empty and referenced by no TypeScript, so nothing is carried across and
-- the rename costs nothing. Renamed because the row no longer records only a snooze: it
-- now also carries the band already announced.
--
-- What this delivers:
--   1. The table renamed to `tracked_action_state`.
--   2. Keyed by `(component_mounted_id, event_actions_id)`, cascading with the part.
--   3. `reached_threshold` and `announced_at`, which the announcements read (#71).
--
-- Idempotent: re-running changes nothing.

-- ---------------------------------------------------------------------------
-- 1. The rename
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS "service_snooze" RENAME TO "tracked_action_state";

-- Renaming a table leaves its constraints under their old names, and Prisma expects the
-- primary key to be named after the table it sits on.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_snooze_pkey') THEN
    ALTER TABLE "tracked_action_state" RENAME CONSTRAINT "service_snooze_pkey" TO "tracked_action_state_pkey";
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Rekeyed onto the part
-- ---------------------------------------------------------------------------
-- The rename carried the old constraints over under their old names; the old key is
-- dropped whole rather than adapted, because no row depends on it.
ALTER TABLE "tracked_action_state" DROP CONSTRAINT IF EXISTS "service_snooze_bike_id_fkey";
ALTER TABLE "tracked_action_state" DROP CONSTRAINT IF EXISTS "service_snooze_event_action_id_fkey";
DROP INDEX IF EXISTS "service_snooze_bike_id_event_action_id_key";

ALTER TABLE "tracked_action_state" DROP COLUMN IF EXISTS "bike_id";

-- The action column takes the name the rest of the schema gives it
-- (`bike_service_interval.event_actions_id`), so the two read alike.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tracked_action_state' AND column_name = 'event_action_id'
  ) THEN
    ALTER TABLE "tracked_action_state" RENAME COLUMN "event_action_id" TO "event_actions_id";
  END IF;
END $$;

ALTER TABLE "tracked_action_state" ADD COLUMN IF NOT EXISTS "component_mounted_id" INTEGER;

-- The table is empty, so the column can be made NOT NULL outright.
ALTER TABLE "tracked_action_state" ALTER COLUMN "component_mounted_id" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tracked_action_state_component_mounted_id_fkey'
  ) THEN
    ALTER TABLE "tracked_action_state"
      ADD CONSTRAINT "tracked_action_state_component_mounted_id_fkey"
      FOREIGN KEY ("component_mounted_id") REFERENCES "components_mounted"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tracked_action_state_event_actions_id_fkey'
  ) THEN
    ALTER TABLE "tracked_action_state"
      ADD CONSTRAINT "tracked_action_state_event_actions_id_fkey"
      FOREIGN KEY ("event_actions_id") REFERENCES "events_action"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- One row per Tracked Action, which is what makes resetting it one write.
CREATE UNIQUE INDEX IF NOT EXISTS "tracked_action_state_component_mounted_id_event_actions_id_key"
  ON "tracked_action_state" ("component_mounted_id", "event_actions_id");

-- ---------------------------------------------------------------------------
-- 3. What has already been announced
-- ---------------------------------------------------------------------------
-- 0 until a band is crossed; then 80, 95 or 100. Moved up or down to whichever band the
-- percentage currently falls in, so a Service or an Extension re-arms the next crossing.
ALTER TABLE "tracked_action_state" ADD COLUMN IF NOT EXISTS "reached_threshold" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "tracked_action_state" ADD COLUMN IF NOT EXISTS "announced_at" TIMESTAMPTZ(6);
