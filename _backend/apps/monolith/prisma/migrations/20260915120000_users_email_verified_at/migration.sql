-- When the account's email was shown to belong to the rider behind it (ADR 0031).
--
-- Null is an Unverified Account: a placeholder that cannot sign in and holds nothing, so
-- whatever next arrives on the address with proof of ownership - a fresh registration, a
-- Google sign-in Google vouches for - replaces it outright. Set is a Verified Email, the
-- only kind the app will ever write to. Nothing else on the row says which it is;
-- `is_active` keeps meaning nothing here.
--
-- Every account that exists before this ships is backfilled as verified from its
-- `created_at` (or the migration's own now() where that is null): nobody proved those
-- addresses, but their owners have been signing in through them, and locking them out for
-- the sake of the definition is the wrong trade.
--
-- Idempotent: the column and its backfill are added together, once. Re-running finds the
-- column and leaves every row alone - a placeholder written after this must stay one.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'email_verified_at'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "email_verified_at" TIMESTAMPTZ(6);
    UPDATE "users" SET "email_verified_at" = COALESCE("created_at", now());
  END IF;
END $$;
