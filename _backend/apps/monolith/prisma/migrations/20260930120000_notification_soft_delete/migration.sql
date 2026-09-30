-- Deleting a notification hides it; the row stays so its dedup key keeps the notice from being sent again.
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ(6);
