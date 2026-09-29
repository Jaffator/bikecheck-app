-- The two settings a Tracked Action carries: the owner's own Service Interval, and whether
-- the app is allowed to announce it (ADR 0033).
--
-- Both live on `tracked_action_state` beside the Extension, but with the opposite lifetime:
-- the Extension dies with the part, while these are copied onto the part that replaces it.
-- "My chain lasts 2 500 km" is about how the bike is ridden, not about this chain.
--
-- `interval_override` is null for a pairing that follows the bike's plan, which is what
-- makes Reset to default meaningful - `bike_service_interval` is still never written.
-- Only the number may be overridden, never the axis, so there is one column and not three.
--
-- `notify` false stops the push and nothing else: the percentage still reads, the colour
-- still warns, and `reached_threshold` keeps moving so unmuting is quiet.
--
-- Idempotent: re-running changes nothing.
ALTER TABLE "tracked_action_state" ADD COLUMN IF NOT EXISTS "interval_override" INTEGER;
ALTER TABLE "tracked_action_state" ADD COLUMN IF NOT EXISTS "notify" BOOLEAN NOT NULL DEFAULT true;
