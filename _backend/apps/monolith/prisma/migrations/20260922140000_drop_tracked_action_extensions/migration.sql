-- Postponing a Tracked Action is gone, and the Extension with it.
--
-- An Extension lengthened the Service Interval the percentage was measured against, so a
-- part put off twice read 100% while it had actually gone 120% of the way. The reading was
-- the one number the owner was meant to trust, and it quietly stopped telling the truth.
-- What an owner who disagrees with the plan does now is raise the interval itself, which
-- says so on the row and survives the next Service instead of expiring with it.
--
-- Dropped rather than left dead: `liveExtension` weighed these against the Service that
-- ended their cycle, and a column nobody reads is a rule nobody can find.
ALTER TABLE "tracked_action_state"
  DROP COLUMN IF EXISTS "extended_by_km",
  DROP COLUMN IF EXISTS "extended_by_min",
  DROP COLUMN IF EXISTS "extended_by_healthIndex",
  DROP COLUMN IF EXISTS "extended_km_at",
  DROP COLUMN IF EXISTS "extended_min_at";
