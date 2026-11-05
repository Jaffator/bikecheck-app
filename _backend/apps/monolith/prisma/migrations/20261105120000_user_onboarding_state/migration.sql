-- Onboarding state on the user (#331).
ALTER TABLE "users" ADD COLUMN "welcome_seen_at" TIMESTAMPTZ(6);
ALTER TABLE "users" ADD COLUMN "hints_seen" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "users" ADD COLUMN "hints_enabled" BOOLEAN NOT NULL DEFAULT true;

-- Existing riders skip the Welcome; hints_seen stays empty, so they do get the Hints.
UPDATE "users" SET "welcome_seen_at" = now();
