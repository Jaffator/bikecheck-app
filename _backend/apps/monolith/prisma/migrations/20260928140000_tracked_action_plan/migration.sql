-- The day an owner means to do one Tracked Action (PRD #179, ADR 0038); null is no plan.
-- Additive and idempotent: re-running changes nothing.
ALTER TABLE "tracked_action_state" ADD COLUMN IF NOT EXISTS "planned_for" DATE;
ALTER TABLE "tracked_action_state" ADD COLUMN IF NOT EXISTS "planned_at" TIMESTAMPTZ(6);
