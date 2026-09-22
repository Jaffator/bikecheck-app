-- The account name is what people are found by in the app, so it has to be there and has to
-- be one of a kind, case- and whitespace-insensitively. Existing rows are made to fit first:
-- an empty name becomes rider-<id>, a duplicate gets " 2", " 3", ... in id order.
--
-- Idempotent: re-running changes nothing.

-- ---------------------------------------------------------------------------
-- 1. Nobody without a name
-- ---------------------------------------------------------------------------
UPDATE "users"
SET "name" = 'rider-' || "id"
WHERE "name" IS NULL OR btrim("name") = '';

-- ---------------------------------------------------------------------------
-- 2. Nobody with somebody else's name: the earliest account keeps it
-- ---------------------------------------------------------------------------
WITH ranked AS (
  SELECT "id",
         btrim("name") AS base,
         row_number() OVER (PARTITION BY lower(btrim("name")) ORDER BY "id") AS n
  FROM "users"
)
UPDATE "users" u
SET "name" = ranked.base || ' ' || ranked.n
FROM ranked
WHERE u."id" = ranked."id" AND ranked.n > 1;

-- ---------------------------------------------------------------------------
-- 3. The rule, from now on
-- ---------------------------------------------------------------------------
ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "users_name_lower_key" ON "users" (lower(btrim("name")));
