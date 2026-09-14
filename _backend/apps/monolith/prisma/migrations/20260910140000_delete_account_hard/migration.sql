-- Deleting an Account: the `users` row goes, and everything belonging to the rider goes
-- with it. No archive, no soft delete - a deliberate deviation from ADR 0024, where a Bike
-- is archived first. See ADR 0028.
--
-- Two things stood in the way.
--
-- 1. `bikes_user_id_fkey` was ON DELETE NO ACTION, the only relation on `users` that did
--    not cascade. Deleting the account would have failed on it.
-- 2. `users.is_deleted` and `users.deleted_at` were never read or written by any code.
--    Left in place they suggest an account can be archived, which it cannot.
--
-- Idempotent: re-running changes nothing.

-- ---------------------------------------------------------------------------
-- 1. A bike falls with its owner
-- ---------------------------------------------------------------------------
-- Everything under a bike already cascades from it - rides, services and their actions and
-- attachments, mounted parts and their setups, service intervals and tracked action state.
DO $$
BEGIN
  ALTER TABLE "bikes" DROP CONSTRAINT IF EXISTS "bikes_user_id_fkey";
  ALTER TABLE "bikes"
    ADD CONSTRAINT "bikes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
END $$;

-- ---------------------------------------------------------------------------
-- 2. An account is never archived
-- ---------------------------------------------------------------------------
ALTER TABLE "users" DROP COLUMN IF EXISTS "is_deleted";
ALTER TABLE "users" DROP COLUMN IF EXISTS "deleted_at";
