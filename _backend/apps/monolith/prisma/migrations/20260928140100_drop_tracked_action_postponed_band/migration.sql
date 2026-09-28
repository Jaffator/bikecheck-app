-- Postpone is gone (ADR 0038): a plan says when, and hides nothing. No data is carried over,
-- so every job postponed before this lists again in Needs attention.
ALTER TABLE "tracked_action_state" DROP COLUMN IF EXISTS "postponed_band";
