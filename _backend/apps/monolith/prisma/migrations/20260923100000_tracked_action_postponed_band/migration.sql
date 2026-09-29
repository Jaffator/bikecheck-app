-- Putting one Tracked Action off, without touching what it reads.
--
-- The band the owner put the job off in. The dashboard skips the pairing while the reading
-- still stands in that same band; any move off it - the next crossing up, or a Service
-- taking the reading back down - ends the postponement on its own. So there is no expiry
-- to run and nothing to clear, and the percentage keeps saying what the part has done.
ALTER TABLE "tracked_action_state"
  ADD COLUMN IF NOT EXISTS "postponed_band" INTEGER;
