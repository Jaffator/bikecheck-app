-- Where a Service was done (PRD #178, ADR 0037): Home, or a Shop with an optional name the
-- owner typed. A shop is a name on the Service, not a row of its own - there is no shops table.
--
-- No backfill: every Service recorded before this reads `place = null`, which means "not
-- recorded", never Home. A name only exists on a SHOP row; the service enforces that, not
-- the database.
--
-- Idempotent: re-running changes nothing.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_place') THEN
    CREATE TYPE "service_place" AS ENUM ('HOME', 'SHOP');
  END IF;
END $$;

ALTER TABLE "events_bikes" ADD COLUMN IF NOT EXISTS "place" "service_place";
ALTER TABLE "events_bikes" ADD COLUMN IF NOT EXISTS "shop_name" VARCHAR(100);
