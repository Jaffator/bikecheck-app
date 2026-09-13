-- Dual adjusters: whether a mounted fork or shock carries a high-speed rebound or compression
-- adjuster beside the low-speed one. A property of the part, so it lives on the part and holds
-- across every setup profile of the bike. Single by default; the Setup sheet switches it.
--
-- Idempotent: re-running changes nothing.

ALTER TABLE "components_mounted"
  ADD COLUMN IF NOT EXISTS "dual_rebound" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "dual_compression" BOOLEAN NOT NULL DEFAULT false;
