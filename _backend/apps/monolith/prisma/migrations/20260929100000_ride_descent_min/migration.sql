-- Descent time per ride (#192, ADR 0040); null on rides imported before it, which are never backfilled.
-- Additive and idempotent: re-running changes nothing.
ALTER TABLE "rides" ADD COLUMN IF NOT EXISTS "descent_min" INTEGER;
